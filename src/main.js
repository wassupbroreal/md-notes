const invoke = window.__TAURI__?.core?.invoke || (() => Promise.resolve([]));
const getCurrentWindow = window.__TAURI__?.window?.getCurrentWindow || (() => ({
  minimize: () => {},
  toggleMaximize: () => {},
  close: () => {}
}));

let notes = [];
let currentNoteId = null;
let hasUnsavedChanges = false;
let onDeleteConfirmCallback = null;
let onUnsavedPromptCallback = null;
let onDeleteBlockConfirmCallback = null;
let activeOutsideClickFn = null;

// Настройки приложения (значения по умолчанию)
let prefs = {
  lang: "en",
  theme: "system",
  fontSize: "14"
};

// Словари локализации
const translations = {
  en: {
    searchPlaceholder: "Search",
    newNoteTooltip: "Create new note",
    untitled: "Untitled",
    saveBtn: "Save",
    saveUnsavedBtn: "Save *",
    savedFeedback: "Saved!",
    deleteConfirm: 'Are you sure you want to delete "{title}"?',
    emptyNote: "Empty note",
    settingsTitle: "Settings",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    langLabel: "Language",
    closeBtn: "Close",
    unsavedChangesPrompt: "You have unsaved changes. Save the current note?",
    titlebarMinimize: "Minimize",
    titlebarMaximize: "Maximize",
    titlebarClose: "Close",
    settingsBtn: "Settings",
    btnAddText: "Add Text Block",
    btnAddChecklist: "Add Checklist Block",
    btnAddTextLabel: "Text",
    btnAddChecklistLabel: "Checklist",
    blockSubtitlePlaceholder: "Subtitle",
    blockBodyPlaceholder: "Write text here",
    blockDescPlaceholder: "Description",
    checklistPlaceholder: "Task",
    btnEditBlock: "Edit",
    btnSaveBlock: "Save",
    btnDeleteBlock: "Delete",
    btnMoveUp: "Move Up",
    btnMoveDown: "Move Down",
    noteDescPlaceholder: "Description",
    savedStatus: "Saved",
    unsavedStatus: "Unsaved",
    confirmDeleteTitle: "Delete Note",
    unsavedTitle: "Save Changes?",
    btnConfirmDeleteOk: "Delete",
    btnConfirmDeleteCancel: "Cancel",
    btnUnsavedYes: "Save",
    btnUnsavedNo: "Don't Save",
    newNoteBtnText: "New Note",
    confirmDeleteBlockTitle: "Delete Block",
    deleteBlockConfirm: "Are you sure you want to delete this block?",
    btnConfirmDeleteBlockOk: "Delete",
    btnConfirmDeleteBlockCancel: "Cancel",
  },
  ru: {
    searchPlaceholder: "Поиск",
    newNoteTooltip: "Создать новую заметку",
    untitled: "Без названия",
    saveBtn: "Сохранить",
    saveUnsavedBtn: "Сохранить *",
    savedFeedback: "Сохранено!",
    deleteConfirm: 'Вы действительно хотите удалить "{title}"?',
    emptyNote: "Пустая заметка",
    settingsTitle: "Настройки",
    themeLabel: "Тема",
    themeLight: "Светлая",
    themeDark: "Темная",
    themeSystem: "Системная",
    langLabel: "Язык",
    closeBtn: "Закрыть",
    unsavedChangesPrompt: "У вас есть несохраненные изменения. Сохранить текущую заметку?",
    titlebarMinimize: "Свернуть",
    titlebarMaximize: "Развернуть",
    titlebarClose: "Закрыть",
    settingsBtn: "Настройки",
    btnAddText: "Добавить текст",
    btnAddChecklist: "Добавить чек-лист",
    btnAddTextLabel: "Текст",
    btnAddChecklistLabel: "Чек-лист",
    blockSubtitlePlaceholder: "Подзаголовок",
    blockBodyPlaceholder: "Напишите текст",
    blockDescPlaceholder: "Описание",
    checklistPlaceholder: "Задача",
    btnEditBlock: "Редактировать",
    btnSaveBlock: "Сохранить",
    btnDeleteBlock: "Удалить",
    btnMoveUp: "Переместить вверх",
    btnMoveDown: "Переместить вниз",
    noteDescPlaceholder: "Описание заметки",
    savedStatus: "Сохранено",
    unsavedStatus: "Не сохранено",
    confirmDeleteTitle: "Удаление заметки",
    unsavedTitle: "Сохранить изменения?",
    btnConfirmDeleteOk: "Удалить",
    btnConfirmDeleteCancel: "Отмена",
    btnUnsavedYes: "Сохранить",
    btnUnsavedNo: "Не сохранять",
    newNoteBtnText: "Создать",
    confirmDeleteBlockTitle: "Удаление блока",
    deleteBlockConfirm: "Вы действительно хотите удалить этот блок?",
    btnConfirmDeleteBlockOk: "Удалить",
    btnConfirmDeleteBlockCancel: "Отмена",
  }
};

// DOM Элементы
let notesListEl;
let searchInputEl;
let searchClearBtnEl;
let newNoteBtnEl;
let noteTitleEl;
let noteDescEl;
let noteContentEl;
let saveBtnEl;

// Кнопки создания блоков
let btnAddText, btnAddChecklist;


// Элементы настроек
let settingsBtnEl;
let settingsModalEl;
let settingsCloseIconEl;
let settingLangEl;
let settingThemeEl;

window.addEventListener("DOMContentLoaded", async () => {
  // Загружаем настройки из localStorage
  loadSettingsPrefs();

  // Инициализация элементов
  notesListEl = document.getElementById("notes-list");
  searchInputEl = document.getElementById("search-input");
  searchClearBtnEl = document.getElementById("search-clear-btn");
  newNoteBtnEl = document.getElementById("new-note-btn");
  noteTitleEl = document.getElementById("note-title");
  noteDescEl = document.getElementById("note-desc");
  noteContentEl = document.getElementById("note-content");
  saveBtnEl = document.getElementById("save-btn");

  btnAddText = document.getElementById("btn-add-text");
  btnAddChecklist = document.getElementById("btn-add-checklist");

  // Элементы настроек
  settingsBtnEl = document.getElementById("settings-btn");
  settingsModalEl = document.getElementById("settings-modal");
  settingsCloseIconEl = document.getElementById("settings-close-icon");
  settingLangEl = document.getElementById("setting-lang");
  settingThemeEl = document.getElementById("setting-theme");

  // Элементы модального окна удаления блока
  const confirmDeleteBlockModal = document.getElementById("confirm-delete-block-modal");
  const confirmDeleteBlockClose = document.getElementById("confirm-delete-block-close");
  const btnConfirmDeleteBlockCancel = document.getElementById("btn-confirm-delete-block-cancel");
  const btnConfirmDeleteBlockOk = document.getElementById("btn-confirm-delete-block-ok");

  const closeDeleteBlockModal = () => {
    confirmDeleteBlockModal.classList.add("hidden");
    onDeleteBlockConfirmCallback = null;
  };

  confirmDeleteBlockClose.addEventListener("click", closeDeleteBlockModal);
  btnConfirmDeleteBlockCancel.addEventListener("click", closeDeleteBlockModal);
  confirmDeleteBlockModal.addEventListener("click", (e) => {
    if (e.target === confirmDeleteBlockModal) closeDeleteBlockModal();
  });

  btnConfirmDeleteBlockOk.addEventListener("click", () => {
    if (onDeleteBlockConfirmCallback) {
      onDeleteBlockConfirmCallback();
    }
  });

  // Настройка управления окном (Tauri window controls)
  setupTitlebarControls();

  // Инициализация интерфейса настроек
  setupSettingsListeners();


  // Основные кнопки
  newNoteBtnEl.addEventListener("click", () => {
    checkAndPromptSave(() => {
      createNewNote();
    });
  });

  saveBtnEl.addEventListener("click", saveCurrentNote);

  // Горячие клавиши (Ctrl + S для быстрого сохранения)
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();
      saveCurrentNote();
    }
  });

  // Создание новых блоков
  btnAddText.addEventListener("click", () => {
    if (!currentNoteId) return;
    const block = createTextBlockHTML();
    block.classList.add("new-block-fade");
    noteContentEl.appendChild(block);
    const subtitle = block.querySelector(".block-subtitle");
    if (subtitle) subtitle.focus({ preventScroll: true }); // Предотвращаем мгновенный скачок браузера при фокусе
    hasUnsavedChanges = true;
    updateUnsavedIndicator();
    updateDeleteBlockButtonsVisibility();
    
    // Прокручиваем контейнер редактора в самый низ
    const container = document.querySelector(".editor-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });

  btnAddChecklist.addEventListener("click", () => {
    if (!currentNoteId) return;
    const block = createChecklistBlockHTML();
    block.classList.add("new-block-fade");
    noteContentEl.appendChild(block);
    const subtitle = block.querySelector(".block-subtitle");
    if (subtitle) subtitle.focus({ preventScroll: true }); // Предотвращаем мгновенный скачок браузера при фокусе
    hasUnsavedChanges = true;
    updateUnsavedIndicator();
    updateDeleteBlockButtonsVisibility();
    
    // Прокручиваем контейнер редактора в самый низ
    const container = document.querySelector(".editor-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });

  // Поиск заметок и управление кнопкой сброса
  searchInputEl.addEventListener("input", () => {
    if (searchInputEl.value.trim() !== "") {
      searchClearBtnEl.classList.remove("hidden");
    } else {
      searchClearBtnEl.classList.add("hidden");
    }
    renderNotesList();
  });

  // Очистка поиска при клике на крестик
  searchClearBtnEl.addEventListener("click", () => {
    searchInputEl.value = "";
    searchClearBtnEl.classList.add("hidden");
    renderNotesList();
    searchInputEl.focus();
  });

  // Отслеживание изменений заголовка
  noteTitleEl.addEventListener("input", () => {
    hasUnsavedChanges = true;
    
    // Обновим название в объекте notes, чтобы updateUnsavedIndicator использовал новый заголовок
    if (currentNoteId) {
      const note = notes.find(n => n.id === currentNoteId);
      if (note) {
        note.title = noteTitleEl.value;
      }
    }
    
    updateUnsavedIndicator();
  });

  // Переход с заголовка на описание при нажатии Enter
  noteTitleEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      noteDescEl.focus();
    }
  });

  // Отслеживание изменений описания
  noteDescEl.addEventListener("input", () => {
    hasUnsavedChanges = true;
    
    if (currentNoteId) {
      const note = notes.find(n => n.id === currentNoteId);
      if (note) {
        note.description = noteDescEl.textContent;
      }
    }
    
    updateUnsavedIndicator();
  });

  // Очистка форматирования при вставке в описание заметки
  noteDescEl.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    document.execCommand("insertText", false, text);
  });

  // Создание первого блока при нажатии Enter на описании
  noteDescEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (noteContentEl.children.length === 0) {
        const block = createTextBlockHTML();
        block.classList.add("new-block-fade");
        noteContentEl.appendChild(block);
        
        block.classList.add("is-editing");
        block.querySelectorAll(".block-subtitle, .block-body, .block-description, .checklist-text").forEach(el => {
          el.setAttribute("contenteditable", "true");
          el.innerHTML = unlinkifyHtml(el.innerHTML);
        });
        
        const subtitle = block.querySelector(".block-subtitle");
        if (subtitle) {
          subtitle.focus({ preventScroll: true });
        }
        
        hasUnsavedChanges = true;
        updateUnsavedIndicator();
        updateDeleteBlockButtonsVisibility();
      } else {
        const firstBlock = noteContentEl.querySelector(".editor-block");
        if (firstBlock) {
          firstBlock.classList.add("is-editing");
          firstBlock.querySelectorAll(".block-subtitle, .block-body, .block-description, .checklist-text").forEach(el => {
            el.setAttribute("contenteditable", "true");
            el.innerHTML = unlinkifyHtml(el.innerHTML);
          });
          const subtitle = firstBlock.querySelector(".block-subtitle");
          if (subtitle) {
            subtitle.focus({ preventScroll: true });
          }
        }
      }
    }
  });

  // Запрет переноса строк и ограничение длины в подзаголовках блоков (100 символов)
  noteContentEl.addEventListener("keydown", (e) => {
    const subtitle = e.target.closest(".block-subtitle");
    if (subtitle) {
      if (e.key === "Enter") {
        e.preventDefault();
        const block = subtitle.closest(".editor-block");
        if (block) {
          const body = block.querySelector(".block-body");
          if (body) {
            body.focus({ preventScroll: true });
          } else {
            const desc = block.querySelector(".block-description");
            if (desc) {
              desc.focus({ preventScroll: true });
            } else {
              const firstItem = block.querySelector(".checklist-text");
              if (firstItem) {
                firstItem.focus({ preventScroll: true });
              }
            }
          }
        }
        return;
      }
      
      const isControlKey = e.ctrlKey || e.metaKey || e.altKey || 
                           e.key === "Backspace" || e.key === "Delete" || 
                           e.key.startsWith("Arrow") || e.key === "Tab";
      
      if (!isControlKey && subtitle.textContent.length >= 100) {
        e.preventDefault();
      }
    }
  });

  // Очистка форматирования при вставке (вставляем только плоский текст во все элементы)
  noteContentEl.addEventListener("paste", (e) => {
    const subtitle = e.target.closest(".block-subtitle");
    if (subtitle) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      const cleanText = text.replace(/[\r\n]/g, "").substring(0, Math.max(0, 100 - subtitle.textContent.length));
      if (cleanText.length > 0) {
        document.execCommand("insertText", false, cleanText);
      }
    } else {
      // Для всех остальных полей (тело блока, описание чек-листа, строки чек-листа)
      // отключаем вставку форматированного HTML
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      document.execCommand("insertText", false, text);
    }
  });

  noteContentEl.addEventListener("input", (e) => {
    hasUnsavedChanges = true;
    updateUnsavedIndicator();

    const subtitle = e.target.closest(".block-subtitle");
    if (subtitle) {
      if (subtitle.textContent.length > 100) {
        subtitle.textContent = subtitle.textContent.substring(0, 100);
        placeCaretAtEnd(subtitle);
      }
    }
  });

  // Предотвращение выделения чекбоксов во всем редакторе
  noteContentEl.addEventListener("mousedown", (e) => {
    if (e.target.closest(".editor-checkbox")) {
      e.preventDefault();
    }
  });

  noteContentEl.addEventListener("selectstart", (e) => {
    if (e.target.closest(".editor-checkbox")) {
      e.preventDefault();
    }
  });

  // Отслеживание кликов по чекбоксам для изменения состояния и кнопок удаления/сохранения/редактирования
  noteContentEl.addEventListener("click", (e) => {
    // -1. Клик по ссылке (открытие в системном браузере)
    const link = e.target.closest("a");
    if (link) {
      e.preventDefault();
      const url = link.getAttribute("href");
      if (url) {
        invoke("open_in_browser", { url: url }).catch(err => {
          console.error("Failed to open link:", err);
          showToast("Failed to open link: " + err);
        });
      }
      return;
    }

    // 0. Клик по иконке блока (только в режиме редактирования)
    const blockIcon = e.target.closest(".block-icon");
    if (blockIcon) {
      const block = blockIcon.closest(".editor-block");
      const isEditing = block && block.classList.contains("is-editing");
      if (isEditing) {
        e.preventDefault();
        openEmojiPicker(blockIcon);
      }
      return;
    }

    // 1. Клик по скролу/строке чек-листа (исключая кнопку удаления)
    const deleteBtnClick = e.target.closest(".checklist-delete-btn");
    if (!deleteBtnClick) {
      const row = e.target.closest(".checklist-row");
      if (row) {
        // Проверяем, находится ли родительский блок в режиме редактирования
        const block = row.closest(".editor-block");
        const isEditing = block && block.classList.contains("is-editing");

        if (isEditing) {
          // В режиме редактирования клик не должен менять состояние чекбокса
          if (e.target.closest(".editor-checkbox")) {
            e.preventDefault();
          }
          return; // Игнорируем переключение состояния
        }

        // Мы в режиме просмотра: клик по любому месту строки (включая текст и чекбокс) переключает состояние
        e.preventDefault();
        const checkbox = row.querySelector(".editor-checkbox");
        if (checkbox) {
          if (checkbox.textContent === "check_box_outline_blank") {
            checkbox.textContent = "check_box";
            checkbox.classList.add("checked");
            row.classList.add("checked-row");
          } else {
            checkbox.textContent = "check_box_outline_blank";
            checkbox.classList.remove("checked");
            row.classList.remove("checked-row");
          }
          hasUnsavedChanges = true;
          updateUnsavedIndicator();
        }
        return;
      }
    }

    // 2. Клик по кнопке удаления чекбокса
    const deleteBtn = e.target.closest(".checklist-delete-btn");
    if (deleteBtn) {
      e.preventDefault();
      // Только в режиме редактирования!
      const block = deleteBtn.closest(".editor-block");
      if (block && !block.classList.contains("is-editing")) return;

      const row = deleteBtn.closest(".checklist-row");
      if (row) {
        row.remove();
        hasUnsavedChanges = true;
        updateUnsavedIndicator();
      }
      return;
    }

    // 3. Клик по кнопке "Редактировать блок" в футере
    const editBlockBtn = e.target.closest(".btn-edit-block");
    if (editBlockBtn) {
      e.preventDefault();
      const block = editBlockBtn.closest(".editor-block");
      if (block) {
        block.classList.add("is-editing");
        
        // Включаем редактирование полей
        block.querySelectorAll(".block-subtitle, .block-body, .block-description, .checklist-text").forEach(el => {
          el.setAttribute("contenteditable", "true");
          el.innerHTML = unlinkifyHtml(el.innerHTML); // Очищаем ссылки при входе в режим редактирования
        });
        
        // Фокусируем первое редактируемое поле
        const firstEditable = block.querySelector(".block-body, .checklist-text");
        if (firstEditable) {
          firstEditable.focus({ preventScroll: true });
          placeCaretAtEnd(firstEditable);
        }
      }
      return;
    }

    // 4. Клик по кнопке "Сохранить блок" в футере
    const saveBlockBtn = e.target.closest(".btn-save-block");
    if (saveBlockBtn) {
      e.preventDefault();
      const block = saveBlockBtn.closest(".editor-block");
      if (block) {
        block.classList.remove("is-editing");
        
        // Выключаем редактирование полей
        block.querySelectorAll(".block-subtitle, .block-body, .block-description, .checklist-text").forEach(el => {
          el.setAttribute("contenteditable", "false");
          el.innerHTML = linkifyHtml(el.innerHTML); // Превращаем ссылки в кликабельные элементы при сохранении
        });
        
        hasUnsavedChanges = true;
        updateUnsavedIndicator();
      }
      return;
    }

    // 5. Клик по кнопке "Удалить блок" в футере
    const deleteBlockBtn = e.target.closest(".btn-delete-block");
    if (deleteBlockBtn) {
      e.preventDefault();
      const block = deleteBlockBtn.closest(".editor-block");
      if (block) {
        const blocks = noteContentEl.querySelectorAll(".editor-block");
        if (blocks.length > 1) {
          showDeleteBlockConfirmModal(block);
        }
      }
      return;
    }

    // 6. Клик по кнопке "Переместить блок вверх" в футере
    const moveUpBtn = e.target.closest(".btn-move-up");
    if (moveUpBtn) {
      e.preventDefault();
      const block = moveUpBtn.closest(".editor-block");
      if (block) {
        const prevBlock = block.previousElementSibling;
        if (prevBlock && prevBlock.classList.contains("editor-block")) {
          prevBlock.before(block);
          hasUnsavedChanges = true;
          updateUnsavedIndicator();
        }
      }
      return;
    }

    // 7. Клик по кнопке "Переместить блок вниз" в футере
    const moveDownBtn = e.target.closest(".btn-move-down");
    if (moveDownBtn) {
      e.preventDefault();
      const block = moveDownBtn.closest(".editor-block");
      if (block) {
        const nextBlock = block.nextElementSibling;
        if (nextBlock && nextBlock.classList.contains("editor-block")) {
          nextBlock.after(block);
          hasUnsavedChanges = true;
          updateUnsavedIndicator();
        }
      }
      return;
    }
  });

  // Обработка клавиш Enter и Backspace в чек-листе
  noteContentEl.addEventListener("keydown", (e) => {
    const activeText = document.activeElement;
    if (activeText && activeText.classList.contains("checklist-text")) {
      // 1. Клавиша Enter
      if (e.key === "Enter") {
        e.preventDefault();
        
        // Разрешаем только в режиме редактирования!
        const block = activeText.closest(".editor-block");
        if (block && !block.classList.contains("is-editing")) return;

        const currentRow = activeText.closest(".checklist-row");
        if (currentRow) {
          // Если строка абсолютно пустая — выходим из режима чек-листа
          if (activeText.textContent.trim() === "") {
            const currentBlock = activeText.closest(".checklist-block");
            currentRow.remove();
            
            if (currentBlock) {
              const newTextBlock = createTextBlockHTML();
              currentBlock.after(newTextBlock);
              const body = newTextBlock.querySelector(".block-body");
              if (body) body.focus();
            }
            
            hasUnsavedChanges = true;
            updateUnsavedIndicator();
            return;
          }

          const newRow = createChecklistRowHTML();
          currentRow.after(newRow);
          const newText = newRow.querySelector(".checklist-text");
          if (newText) {
            newText.focus();
          }
          hasUnsavedChanges = true;
          updateUnsavedIndicator();
        }
        return;
      }

      // 2. Клавиша Backspace
      if (e.key === "Backspace") {
        // Разрешаем только в режиме редактирования!
        const block = activeText.closest(".editor-block");
        if (block && !block.classList.contains("is-editing")) return;

        if (activeText.textContent === "") {
          e.preventDefault();
          const currentRow = activeText.closest(".checklist-row");
          if (currentRow) {
            const prevSibling = currentRow.previousElementSibling;
            currentRow.remove();
            hasUnsavedChanges = true;
            updateUnsavedIndicator();
            if (prevSibling) {
              if (prevSibling.classList.contains("checklist-row")) {
                const prevText = prevSibling.querySelector(".checklist-text");
                if (prevText) {
                  prevText.focus();
                  placeCaretAtEnd(prevText);
                }
              } else {
                prevSibling.focus();
                placeCaretAtEnd(prevSibling);
              }
            } else {
              noteContentEl.focus();
            }
          }
        }
        return;
      }
    }
  });



  // Хоткей Ctrl + S для сохранения (раскладка-независимый)
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();
      saveCurrentNote();
    }
  });

  // Отключение стандартного контекстного меню браузера во всем приложении
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });

  // Инициализация событий для кастомного окна удаления
  document.getElementById("btn-confirm-delete-ok").addEventListener("click", () => {
    if (onDeleteConfirmCallback) onDeleteConfirmCallback();
  });
  
  const closeDeleteModal = () => {
    document.getElementById("confirm-delete-modal").classList.add("hidden");
    onDeleteConfirmCallback = null;
  };
  
  document.getElementById("btn-confirm-delete-cancel").addEventListener("click", closeDeleteModal);
  document.getElementById("confirm-delete-close").addEventListener("click", closeDeleteModal);
  document.getElementById("confirm-delete-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("confirm-delete-modal")) {
      closeDeleteModal();
    }
  });

  // Инициализация событий для кастомного окна несохраненных изменений
  document.getElementById("btn-unsaved-yes").addEventListener("click", () => {
    if (onUnsavedPromptCallback) onUnsavedPromptCallback(true);
  });
  
  document.getElementById("btn-unsaved-no").addEventListener("click", () => {
    if (onUnsavedPromptCallback) onUnsavedPromptCallback(false);
  });
  
  const closeUnsavedModal = () => {
    document.getElementById("unsaved-modal").classList.add("hidden");
    onUnsavedPromptCallback = null;
  };
  
  document.getElementById("unsaved-close").addEventListener("click", closeUnsavedModal);
  document.getElementById("unsaved-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("unsaved-modal")) {
      closeUnsavedModal();
    }
  });

  try {
    // Применяем текущие настройки к элементам UI
    applySettingsPrefs();
    translateUI();

    // Первоначальная загрузка заметок
    await loadNotes();
  } catch (err) {
    console.error("Ошибка при инициализации приложения:", err);
  } finally {
    // Отключение экрана загрузки (splash screen) после инициализации
    const splash = document.getElementById("splash");
    if (splash) {
      setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => {
          splash.style.display = "none";
        }, 380);
      }, 500);
    }
  }
});

// Управление окном через Titlebar
function setupTitlebarControls() {
  const appWindow = getCurrentWindow();
  
  document.getElementById("titlebar-minimize").addEventListener("click", () => {
    appWindow.minimize();
  });
  
  document.getElementById("titlebar-maximize").addEventListener("click", () => {
    appWindow.toggleMaximize();
  });
  
  document.getElementById("titlebar-close").addEventListener("click", () => {
    appWindow.close();
  });
}



// Настройка панели настроек
function setupSettingsListeners() {
  // Открытие/закрытие модального окна
  settingsBtnEl.addEventListener("click", () => {
    // Устанавливаем текущие значения в селекты
    settingLangEl.value = prefs.lang;
    settingThemeEl.value = prefs.theme;
    settingsModalEl.classList.remove("hidden");
  });

  settingsCloseIconEl.addEventListener("click", () => {
    settingsModalEl.classList.add("hidden");
  });

  // Закрытие по клику вне контента (на оверлей)
  settingsModalEl.addEventListener("click", (e) => {
    if (e.target === settingsModalEl) {
      settingsModalEl.classList.add("hidden");
    }
  });

  // Отслеживание изменений настроек
  settingLangEl.addEventListener("change", (e) => {
    prefs.lang = e.target.value;
    saveSettingsPrefs();
    translateUI();
  });

  settingThemeEl.addEventListener("change", (e) => {
    prefs.theme = e.target.value;
    saveSettingsPrefs();
    applySettingsPrefs();
  });
}

// Загрузка настроек из localStorage
function loadSettingsPrefs() {
  const saved = localStorage.getItem("mdnotes-settings");
  if (saved) {
    try {
      prefs = { ...prefs, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Ошибка загрузки настроек:", e);
    }
  } else {
    // Английский язык по умолчанию при первом запуске
    prefs.lang = "en";
    saveSettingsPrefs();
  }
}

// Сохранение настроек в localStorage
function saveSettingsPrefs() {
  localStorage.setItem("mdnotes-settings", JSON.stringify(prefs));
}

// Применение визуальных настроек (тема, шрифт)
function applySettingsPrefs() {
  // Отключаем анимацию переходов во всем документе на время смены темы
  document.documentElement.classList.add("no-transitions");

  // Тема оформления
  if (prefs.theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else if (prefs.theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  // Принудительно заставляем браузер применить новые цвета без переходов (reflow)
  void document.documentElement.offsetHeight;

  // Возвращаем анимации переходов в следующем цикле отрисовки
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("no-transitions");
    });
  });
}

// Перевод интерфейса в соответствии с выбранным языком
function translateUI() {
  const t = translations[prefs.lang] || translations.en;

  // Инпуты и плейсхолдеры
  searchInputEl.placeholder = t.searchPlaceholder;
  noteTitleEl.placeholder = t.untitled;
  noteDescEl.setAttribute("placeholder", t.noteDescPlaceholder);

  // Кнопка сохранения
  updateUnsavedIndicator();

  // Шапка и заголовок настроек
  newNoteBtnEl.textContent = t.newNoteBtnText;
  saveBtnEl.textContent = t.saveBtn;
  settingsBtnEl.textContent = t.settingsBtn;
  document.getElementById("settings-modal-title").textContent = t.settingsTitle;
  
  // Лейблы настроек
  document.getElementById("label-setting-lang").textContent = t.langLabel;
  document.getElementById("label-setting-theme").textContent = t.themeLabel;

  // Опции тем
  document.getElementById("opt-theme-system").textContent = t.themeSystem;
  document.getElementById("opt-theme-light").textContent = t.themeLight;
  document.getElementById("opt-theme-dark").textContent = t.themeDark;

  // Локализация кастомных модальных диалогов
  document.getElementById("confirm-delete-title").textContent = t.confirmDeleteTitle;
  document.getElementById("btn-confirm-delete-cancel").textContent = t.btnConfirmDeleteCancel;
  document.getElementById("btn-confirm-delete-ok").textContent = t.btnConfirmDeleteOk;

  // Локализация удаления блока
  document.getElementById("confirm-delete-block-title").textContent = t.confirmDeleteBlockTitle;
  document.getElementById("confirm-delete-block-message").textContent = t.deleteBlockConfirm;
  document.getElementById("btn-confirm-delete-block-cancel").textContent = t.btnConfirmDeleteBlockCancel;
  document.getElementById("btn-confirm-delete-block-ok").textContent = t.btnConfirmDeleteBlockOk;

  document.getElementById("unsaved-title").textContent = t.unsavedTitle;
  document.getElementById("unsaved-message").textContent = t.unsavedChangesPrompt;
  document.getElementById("btn-unsaved-no").textContent = t.btnUnsavedNo;
  document.getElementById("btn-unsaved-yes").textContent = t.btnUnsavedYes;

  // Тултипы/подсказки кнопок тулбара и текстовые надписи
  if (btnAddText) {
    btnAddText.title = t.btnAddText;
    const txtEl = document.getElementById("btn-add-text-text");
    if (txtEl) txtEl.textContent = t.btnAddTextLabel;
  }
  if (btnAddChecklist) {
    btnAddChecklist.title = t.btnAddChecklist;
    const txtEl = document.getElementById("btn-add-checklist-text");
    if (txtEl) txtEl.textContent = t.btnAddChecklistLabel;
  }

  // Локализация кнопок в блоках редактора
  document.querySelectorAll(".btn-move-up").forEach(el => el.title = t.btnMoveUp);
  document.querySelectorAll(".btn-move-down").forEach(el => el.title = t.btnMoveDown);
  document.querySelectorAll(".btn-edit-block").forEach(el => el.title = t.btnEditBlock);
  document.querySelectorAll(".btn-save-block").forEach(el => el.title = t.btnSaveBlock);
  document.querySelectorAll(".btn-delete-block").forEach(el => el.title = t.btnDeleteBlock);

  // Локализация плейсхолдеров в блоках редактора
  document.querySelectorAll(".block-subtitle").forEach(el => el.setAttribute("placeholder", t.blockSubtitlePlaceholder));
  document.querySelectorAll(".block-body").forEach(el => el.setAttribute("placeholder", t.blockBodyPlaceholder));
  document.querySelectorAll(".block-description").forEach(el => el.setAttribute("placeholder", t.blockDescPlaceholder));
  document.querySelectorAll(".checklist-text").forEach(el => el.setAttribute("placeholder", t.checklistPlaceholder));



  // Перерендерить список заметок, чтобы обновить плейсхолдеры
  renderNotesList();
}

// Загрузка заметок с бэкенда
async function loadNotes() {
  try {
    notes = await invoke("load_notes");
    renderNotesList();
    
    if (notes.length > 0) {
      selectNote(notes[0].id);
    } else {
      showWelcomeScreen();
    }
  } catch (err) {
    console.error("Не удалось загрузить заметки:", err);
  }
}

// Рендер списка заметок в сайдбаре
function renderNotesList() {
  const query = searchInputEl.value.toLowerCase().trim();
  notesListEl.innerHTML = "";
  const t = translations[prefs.lang] || translations.en;

  const filteredNotes = notes.filter(note => {
    const titleMatch = (note.title || "").toLowerCase().includes(query);
    const descMatch = (note.description || "").toLowerCase().includes(query);
    const contentMatch = getPlainTextPreview(note.content).toLowerCase().includes(query);
    return titleMatch || descMatch || contentMatch;
  });

  filteredNotes.forEach(note => {
    const noteItem = document.createElement("div");
    noteItem.className = `note-item${note.id === currentNoteId ? " active" : ""}`;
    noteItem.setAttribute("data-id", note.id);

    // Добавляем иконку заметки
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined note-item-icon";
    icon.textContent = "description";

    const info = document.createElement("div");
    info.className = "note-item-info";

    const title = document.createElement("span");
    title.className = "note-item-title";
    title.textContent = note.title.trim() || t.untitled;

    info.appendChild(title);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "note-item-delete";
    deleteBtn.innerHTML = `<span class="material-symbols-outlined">delete</span>`;
    
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showDeleteConfirmModal(note.id, note.title);
    });

    noteItem.appendChild(icon);
    noteItem.appendChild(info);
    noteItem.appendChild(deleteBtn);

    noteItem.addEventListener("click", () => {
      if (note.id !== currentNoteId) {
        checkAndPromptSave(() => {
          selectNote(note.id);
        });
      }
    });

    notesListEl.appendChild(noteItem);
  });
}

// Переключение на заметку
function selectNote(id) {
  currentNoteId = id;
  const note = notes.find(n => n.id === id);
  if (note) {
    const container = document.querySelector(".editor-container");
    const welcome = document.getElementById("welcome");

    // Показываем контейнер редактора и скрываем приветствие
    if (container) container.classList.remove("hidden");
    if (welcome) welcome.classList.add("hidden");

    // Сброс и перезапуск анимации плавного проявления контента редактора
    if (container) {
      container.classList.remove("fade-active");
      void container.offsetHeight; // форсируем reflow для сброса анимации
      container.classList.add("fade-active");
    }

    noteTitleEl.value = note.title;
    noteDescEl.textContent = note.description || "";
    noteContentEl.innerHTML = note.content;
    
    // Миграция: переводим блоки на новую боковую панель управления и блокируем редактирование на старте
    noteContentEl.querySelectorAll(".editor-block").forEach(block => {
      // 1. Убедимся, что контент завернут в .block-content-wrapper
      let contentWrapper = block.querySelector(".block-content-wrapper");
      if (!contentWrapper) {
        contentWrapper = document.createElement("div");
        contentWrapper.className = "block-content-wrapper";
        
        // Переносим все существующие элементы контента
        const childrenToWrap = Array.from(block.children).filter(child => {
          return !child.classList.contains("block-footer") && !child.classList.contains("block-control-panel");
        });
        
        childrenToWrap.forEach(child => {
          contentWrapper.appendChild(child);
        });
        
        block.appendChild(contentWrapper);
      }
      
      // 2. Удаляем старые футеры / панели управления / панели цвета
      const oldFooter = block.querySelector(".block-footer");
      if (oldFooter) oldFooter.remove();
      
      const oldPanel = block.querySelector(".block-control-panel");
      if (oldPanel) oldPanel.remove();
      
      const oldColorPanel = block.querySelector(".block-color-panel");
      if (oldColorPanel) oldColorPanel.remove();

      // Убедимся, что есть основной ряд .block-main-row
      let mainRow = block.querySelector(".block-main-row");
      if (!mainRow) {
        mainRow = document.createElement("div");
        mainRow.className = "block-main-row";
        if (contentWrapper) {
          mainRow.appendChild(contentWrapper);
        }
        block.appendChild(mainRow);
      }

      // Убедимся, что в заголовке блока есть иконка .block-icon
      const header = block.querySelector(".block-header");
      if (header) {
        let icon = header.querySelector(".block-icon");
        if (!icon) {
          icon = document.createElement("div");
          icon.className = "block-icon material-symbols-outlined";
          icon.setAttribute("data-icon", "");
          header.insertBefore(icon, header.firstChild);
        } else {
          // Миграция со старого формата data-emoji на data-icon
          if (!icon.classList.contains("material-symbols-outlined")) {
            icon.classList.add("material-symbols-outlined");
          }
          if (icon.hasAttribute("data-emoji")) {
            const oldEmoji = icon.getAttribute("data-emoji");
            const emojiMap = {
              "📝": "description", "💡": "lightbulb", "📌": "push_pin", "⚠️": "warning",
              "🚀": "rocket_launch", "🎯": "target", "🔥": "local_fire_department",
              "✅": "check_circle", "ℹ️": "info", "ℹ": "info", "📅": "calendar_month",
              "💻": "terminal", "🎨": "palette", "⭐": "star", "❤️": "favorite", "🔔": "notifications"
            };
            const mappedIcon = emojiMap[oldEmoji] || "";
            icon.setAttribute("data-icon", mappedIcon);
            icon.textContent = mappedIcon;
            icon.removeAttribute("data-emoji");
          }
        }
      }
      
      // 3. Создаем свежие панели
      const panel = createBlockControlPanelHTML();
      mainRow.appendChild(panel);

      // Находим текущий цветовой класс блока (по умолчанию color-default)
      let activeColorClass = "color-default";
      const classes = [
        "color-default", "color-red", "color-orange", "color-yellow",
        "color-green", "color-teal", "color-blue", "color-purple",
        "color-pink", "color-gray"
      ];
      for (const cls of classes) {
        if (block.classList.contains(cls)) {
          activeColorClass = cls;
          break;
        }
      }
      if (!block.classList.contains(activeColorClass)) {
        block.classList.add(activeColorClass);
      }

      // Удаляем временные ручки перетаскивания (если они были сохранены)
      block.querySelectorAll(".checklist-drag-handle").forEach(el => el.remove());
      block.querySelectorAll(".checklist-row").forEach(row => {
        row.removeAttribute("draggable");
      });

      const colorPanel = createBlockColorPanelHTML(activeColorClass);
      block.appendChild(colorPanel);
      
      // 4. Блокируем редактирование на старте
      block.classList.remove("is-editing");
      block.querySelectorAll(".block-subtitle, .block-body, .block-description, .checklist-text").forEach(el => {
        el.setAttribute("contenteditable", "false");
        el.innerHTML = linkifyHtml(el.innerHTML); // Превращаем ссылки в кликабельные элементы при загрузке
      });
    });

    hasUnsavedChanges = false;
    updateUnsavedIndicator();
    document.querySelectorAll(".note-item").forEach(item => {
      if (item.getAttribute("data-id") === id) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    updateDeleteBlockButtonsVisibility();
  }
}

// Создание новой заметки
function createNewNote() {
  const newId = crypto.randomUUID();
  
  // Показываем контейнер редактора и скрываем приветствие
  const container = document.querySelector(".editor-container");
  const welcome = document.getElementById("welcome");
  if (container) container.classList.remove("hidden");
  if (welcome) welcome.classList.add("hidden");

  const newNote = {
    id: newId,
    title: "",
    description: "",
    content: "",
    updated_at: Date.now()
  };

  notes.unshift(newNote);
  currentNoteId = newId;
  
  renderNotesList();
  selectNote(newId);
  
  // При создании новой заметки сразу фокусируемся на заголовке
  noteTitleEl.focus();
}

// Сохранение заметки
async function saveCurrentNote() {
  if (!currentNoteId) return;

  const title = noteTitleEl.value;
  const content = getCleanContentHTML(); // Очищаем HTML перед сохранением!
  const t = translations[prefs.lang] || translations.en;

  try {
    const savedNote = await invoke("save_note", {
      id: currentNoteId,
      title: title || t.untitled,
      description: noteDescEl.textContent || "",
      content: content
    });

    const index = notes.findIndex(n => n.id === currentNoteId);
    if (index !== -1) {
      notes[index] = savedNote;
      notes.sort((a, b) => b.updated_at - a.updated_at);
    }

    hasUnsavedChanges = false;
    updateUnsavedIndicator();
    renderNotesList();
    
    // Показываем всплывающее уведомление о сохранении
    showToast(t.savedFeedback);

  } catch (err) {
    console.error("Ошибка при сохранении заметки:", err);
    alert("Error: " + err);
  }
}

// Показ окна удаления заметки
function showDeleteConfirmModal(noteId, noteTitle) {
  const modal = document.getElementById("confirm-delete-modal");
  const messageEl = document.getElementById("confirm-delete-message");
  const t = translations[prefs.lang] || translations.en;
  
  messageEl.textContent = t.deleteConfirm.replace("{title}", noteTitle || t.untitled);
  modal.classList.remove("hidden");
  
  onDeleteConfirmCallback = async () => {
    modal.classList.add("hidden");
    try {
      await invoke("delete_note", { id: noteId });
      notes = notes.filter(n => n.id !== noteId);
      renderNotesList();
      
      if (currentNoteId === noteId) {
        currentNoteId = null;
        hasUnsavedChanges = false;
        if (notes.length > 0) {
          selectNote(notes[0].id);
        } else {
          showWelcomeScreen();
        }
      }
    } catch (err) {
      console.error("Ошибка при удалении заметки:", err);
    }
    onDeleteConfirmCallback = null;
  };
}

// Показ экрана приветствия при отсутствии заметок
function showWelcomeScreen() {
  currentNoteId = null;
  hasUnsavedChanges = false;

  const container = document.querySelector(".editor-container");
  const welcome = document.getElementById("welcome");
  if (container) container.classList.add("hidden");
  if (welcome) welcome.classList.remove("hidden");

  const winTitleEl = document.getElementById("win-title");
  if (winTitleEl) winTitleEl.textContent = "";

  updateUnsavedIndicator();
}

// Проверка и предложение сохранить изменения перед переключением/созданием
function checkAndPromptSave(onComplete) {
  const t = translations[prefs.lang] || translations.en;
  if (hasUnsavedChanges && currentNoteId) {
    const modal = document.getElementById("unsaved-modal");
    modal.classList.remove("hidden");
    
    onUnsavedPromptCallback = async (shouldSave) => {
      modal.classList.add("hidden");
      if (shouldSave) {
        await saveCurrentNote();
      } else {
        // Если не сохраняем, сбрасываем признак изменений
        hasUnsavedChanges = false;
        updateUnsavedIndicator();
      }
      onComplete();
      onUnsavedPromptCallback = null;
    };
  } else {
    onComplete();
  }
}



// Индикатор несохраненных изменений
function updateUnsavedIndicator() {
  const winTitleEl = document.getElementById("win-title");
  const t = translations[prefs.lang] || translations.en;
  
  if (hasUnsavedChanges) {
    saveBtnEl.textContent = t.saveBtn; // Всегда пишем Сохранить / Save без звездочки
    saveBtnEl.classList.add("unsaved");
  } else {
    saveBtnEl.textContent = t.saveBtn;
    saveBtnEl.classList.remove("unsaved");
  }

  if (winTitleEl && currentNoteId) {
    const note = notes.find(n => n.id === currentNoteId);
    if (note) {
      let title = note.title.trim() || t.untitled;
      if (hasUnsavedChanges) {
        title += ` - ${t.unsavedStatus || "Unsaved"}`;
      } else {
        title += ` - ${t.savedStatus || "Saved"}`;
      }
      winTitleEl.textContent = title;
    }
  }
}

function getNotesDirectoryPath() {
  for (let n of notes) {
    if (n.path) {
      const lastIndex = Math.max(n.path.lastIndexOf('/'), n.path.lastIndexOf('\\'));
      if (lastIndex !== -1) {
        return n.path.substring(0, lastIndex);
      }
    }
  }
  return "C:\\Users\\wassupbro\\Documents\\MD Notes";
}

// Вспомогательная функция для получения превью текста
function getPlainTextPreview(html) {
  const t = translations[prefs.lang] || translations.en;
  if (!html) return t.emptyNote;
  const temp = document.createElement("div");
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || "";
  return text.trim() || t.emptyNote;
}

// Показ всплывающего уведомления (Toast)
function showToast(message) {
  let toastEl = document.getElementById("toast-notification");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "toast-notification";
    toastEl.className = "toast";

    const iconEl = document.createElement("span");
    iconEl.className = "material-symbols-outlined toast-icon";
    iconEl.textContent = "check";

    const textEl = document.createElement("span");
    textEl.id = "toast-text";

    toastEl.appendChild(iconEl);
    toastEl.appendChild(textEl);
    document.body.appendChild(toastEl);
  }

  const textEl = document.getElementById("toast-text");
  textEl.textContent = message;

  toastEl.classList.add("show");

  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }

  window.toastTimeout = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2500);
}


// Генерация строки чек-листа
function createChecklistRowHTML() {
  const row = document.createElement("div");
  row.className = "checklist-row";
  row.setAttribute("contenteditable", "false");

  const checkbox = document.createElement("span");
  checkbox.className = "material-symbols-outlined editor-checkbox";
  checkbox.setAttribute("contenteditable", "false");
  checkbox.textContent = "check_box_outline_blank";

  const textInput = document.createElement("div");
  textInput.className = "checklist-text";
  textInput.setAttribute("contenteditable", "true");
  textInput.setAttribute("placeholder", translations[prefs.lang].checklistPlaceholder || "Task...");

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "checklist-delete-btn";
  deleteBtn.setAttribute("contenteditable", "false");
  deleteBtn.innerHTML = "&times;";

  row.appendChild(checkbox);
  row.appendChild(textInput);
  row.appendChild(deleteBtn);

  return row;
}

// Генерация текстового блока
function createBlockColorPanelHTML(currentClass) {
  const panel = document.createElement("div");
  panel.className = "block-color-panel";
  panel.setAttribute("contenteditable", "false");

  const colors = [
    { className: "color-default", hex: "var(--bg-sidebar)" },
    { className: "color-red", hex: "#ff4d4d" },
    { className: "color-orange", hex: "#f97316" },
    { className: "color-yellow", hex: "#ffb84d" },
    { className: "color-green", hex: "#22c55e" },
    { className: "color-teal", hex: "#14b8a6" },
    { className: "color-blue", hex: "#3b82f6" },
    { className: "color-purple", hex: "#a855f7" },
    { className: "color-pink", hex: "#ec4899" },
    { className: "color-gray", hex: "#8b8b8b" }
  ];

  // Определяем активный цвет
  const activeClass = currentClass || "color-default";

  colors.forEach(col => {
    const swatch = document.createElement("button");
    swatch.className = `color-swatch ${col.className === activeClass ? "active" : ""}`;
    swatch.style.backgroundColor = col.hex;
    swatch.title = col.className.replace("color-", "");

    swatch.addEventListener("click", (e) => {
      e.preventDefault();
      const block = swatch.closest(".editor-block");
      if (block) {
        // Удаляем все старые цветовые классы
        colors.forEach(c => block.classList.remove(c.className));
        // Добавляем новый цветовой класс
        block.classList.add(col.className);

        // Обновляем активность свотчей в этой панели
        panel.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
        swatch.classList.add("active");

        hasUnsavedChanges = true;
        updateUnsavedIndicator();
      }
    });

    panel.appendChild(swatch);
  });

  return panel;
}

function createTextBlockHTML() {
  const block = document.createElement("div");
  block.className = "editor-block text-block is-editing color-default"; // Создается в режиме редактирования по умолчанию
  block.setAttribute("contenteditable", "false");

  const mainRow = document.createElement("div");
  mainRow.className = "block-main-row";

  const contentWrapper = document.createElement("div");
  contentWrapper.className = "block-content-wrapper";

  const header = document.createElement("div");
  header.className = "block-header";

  const icon = document.createElement("div");
  icon.className = "block-icon material-symbols-outlined";
  icon.setAttribute("data-icon", "");

  const subtitle = document.createElement("div");
  subtitle.className = "block-subtitle";
  subtitle.setAttribute("contenteditable", "true");
  subtitle.setAttribute("placeholder", translations[prefs.lang].blockSubtitlePlaceholder || "Subtitle...");

  header.appendChild(icon);
  header.appendChild(subtitle);

  const body = document.createElement("div");
  body.className = "block-body";
  body.setAttribute("contenteditable", "true");
  body.setAttribute("placeholder", translations[prefs.lang].blockBodyPlaceholder || "Write text here...");

  contentWrapper.appendChild(header);
  contentWrapper.appendChild(body);

  const controlPanel = createBlockControlPanelHTML();

  mainRow.appendChild(contentWrapper);
  mainRow.appendChild(controlPanel);

  const colorPanel = createBlockColorPanelHTML("color-default");

  block.appendChild(mainRow);
  block.appendChild(colorPanel);

  return block;
}

// Генерация блока чек-листа
function createChecklistBlockHTML() {
  const block = document.createElement("div");
  block.className = "editor-block checklist-block is-editing color-default"; // Создается в режиме редактирования по умолчанию
  block.setAttribute("contenteditable", "false");

  const mainRow = document.createElement("div");
  mainRow.className = "block-main-row";

  const contentWrapper = document.createElement("div");
  contentWrapper.className = "block-content-wrapper";

  const header = document.createElement("div");
  header.className = "block-header";

  const icon = document.createElement("div");
  icon.className = "block-icon material-symbols-outlined";
  icon.setAttribute("data-icon", "");

  const subtitle = document.createElement("div");
  subtitle.className = "block-subtitle";
  subtitle.setAttribute("contenteditable", "true");
  subtitle.setAttribute("placeholder", translations[prefs.lang].blockSubtitlePlaceholder || "Subtitle...");

  header.appendChild(icon);
  header.appendChild(subtitle);

  const description = document.createElement("div");
  description.className = "block-description";
  description.setAttribute("contenteditable", "true");
  description.setAttribute("placeholder", translations[prefs.lang].blockDescPlaceholder || "Description...");

  const itemsContainer = document.createElement("div");
  itemsContainer.className = "block-checklist-items";

  // Добавляем первый пустой чекбокс
  const initialItem = createChecklistRowHTML();
  itemsContainer.appendChild(initialItem);

  contentWrapper.appendChild(header);
  contentWrapper.appendChild(description);
  contentWrapper.appendChild(itemsContainer);

  const controlPanel = createBlockControlPanelHTML();

  mainRow.appendChild(contentWrapper);
  mainRow.appendChild(controlPanel);

  const colorPanel = createBlockColorPanelHTML("color-default");

  block.appendChild(mainRow);
  block.appendChild(colorPanel);

  return block;
}

// Извлечение имени файла из пути
function getFilenameFromPath(path) {
  if (!path) return "";
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1];
}

// Генерация боковой панели управления блока (вместо футера)
function createBlockControlPanelHTML() {
  const panel = document.createElement("div");
  panel.className = "block-control-panel";
  panel.setAttribute("contenteditable", "false");

  // Верхняя группа: кнопки перемещения
  const topGroup = document.createElement("div");
  topGroup.className = "control-top";
  topGroup.setAttribute("contenteditable", "false");

  const moveUpBtn = document.createElement("button");
  moveUpBtn.className = "block-btn btn-move-up";
  moveUpBtn.setAttribute("contenteditable", "false");
  moveUpBtn.innerHTML = `<span class="material-symbols-outlined">arrow_upward</span>`;

  const moveDownBtn = document.createElement("button");
  moveDownBtn.className = "block-btn btn-move-down";
  moveDownBtn.setAttribute("contenteditable", "false");
  moveDownBtn.innerHTML = `<span class="material-symbols-outlined">arrow_downward</span>`;

  const t = translations[prefs.lang] || translations.en;
  moveUpBtn.title = t.btnMoveUp;
  moveDownBtn.title = t.btnMoveDown;

  topGroup.appendChild(moveUpBtn);
  topGroup.appendChild(moveDownBtn);

  // Правая/нижняя группа: действия с блоком
  const bottomGroup = document.createElement("div");
  bottomGroup.className = "control-bottom";
  bottomGroup.setAttribute("contenteditable", "false");

  const editBtn = document.createElement("button");
  editBtn.className = "block-btn btn-edit-block";
  editBtn.setAttribute("contenteditable", "false");
  editBtn.title = t.btnEditBlock;
  editBtn.innerHTML = `<span class="material-symbols-outlined">edit</span>`;

  const saveBtn = document.createElement("button");
  saveBtn.className = "block-btn btn-save-block";
  saveBtn.setAttribute("contenteditable", "false");
  saveBtn.title = t.btnSaveBlock;
  saveBtn.innerHTML = `<span class="material-symbols-outlined">save</span>`;

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "block-btn btn-delete-block";
  deleteBtn.setAttribute("contenteditable", "false");
  deleteBtn.title = t.btnDeleteBlock;
  deleteBtn.innerHTML = `<span class="material-symbols-outlined">delete</span>`;

  bottomGroup.appendChild(editBtn);
  bottomGroup.appendChild(saveBtn);
  bottomGroup.appendChild(deleteBtn);

  panel.appendChild(topGroup);
  panel.appendChild(bottomGroup);

  return panel;
}

// Очистка HTML перед сохранением (убираем режим редактирования)
function getCleanContentHTML() {
  const temp = document.createElement("div");
  temp.innerHTML = noteContentEl.innerHTML;
  
  temp.querySelectorAll(".editor-block").forEach(block => {
    block.classList.remove("is-editing");
    block.classList.remove("new-block-fade"); // Очищаем временный класс анимации перед сохранением
    block.querySelectorAll(".block-subtitle, .block-body, .block-description, .checklist-text").forEach(el => {
      el.setAttribute("contenteditable", "false");
      el.innerHTML = linkifyHtml(el.innerHTML); // Убеждаемся, что ссылки кликабельны в сохраненном HTML
    });

    const cp = block.querySelector(".block-control-panel");
    if (cp) cp.remove();

    const colP = block.querySelector(".block-color-panel");
    if (colP) colP.remove();
  });

  temp.querySelectorAll(".checklist-drag-handle").forEach(el => el.remove());
  temp.querySelectorAll(".checklist-row").forEach(row => {
    row.removeAttribute("draggable");
    row.classList.remove("dragging");
  });
  
  return temp.innerHTML;
}

// Проверка: находится ли фокус/выделение внутри уже созданного чек-листа
function isSelectionInsideChecklist() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    let node = selection.getRangeAt(0).startContainer;
    while (node && node !== noteContentEl) {
      if (node.nodeType === Node.ELEMENT_NODE && (node.classList.contains("checklist-text") || node.classList.contains("checklist-row"))) {
        return true;
      }
      node = node.parentNode;
    }
  }
  return false;
}

// Установка каретки в конец редактируемого элемента
function placeCaretAtEnd(el) {
  el.focus({ preventScroll: true });
  if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// Управление видимостью кнопки удаления блоков (если только 1 блок - кнопка скрывается)
function updateDeleteBlockButtonsVisibility() {
  const blocks = noteContentEl.querySelectorAll(".editor-block");
  if (blocks.length <= 1) {
    blocks.forEach(block => {
      const deleteBtn = block.querySelector(".btn-delete-block");
      if (deleteBtn) {
        deleteBtn.classList.add("hidden");
      }
    });
  } else {
    blocks.forEach(block => {
      const deleteBtn = block.querySelector(".btn-delete-block");
      if (deleteBtn) {
        deleteBtn.classList.remove("hidden");
      }
    });
  }
}

// Показ окна подтверждения удаления блока
function showDeleteBlockConfirmModal(block) {
  const modal = document.getElementById("confirm-delete-block-modal");
  const messageEl = document.getElementById("confirm-delete-block-message");
  const t = translations[prefs.lang] || translations.en;
  
  messageEl.textContent = t.deleteBlockConfirm;
  modal.classList.remove("hidden");
  
  onDeleteBlockConfirmCallback = () => {
    modal.classList.add("hidden");
    block.remove();
    hasUnsavedChanges = true;
    updateUnsavedIndicator();
    updateDeleteBlockButtonsVisibility();
    onDeleteBlockConfirmCallback = null;
  };
}

// Показ всплывающего окна выбора иконки для блока (Google Material Icons)
function openEmojiPicker(blockIcon) {
  closeAllEmojiPickers();

  const header = blockIcon.closest(".block-header");
  if (!header) return;

  const picker = document.createElement("div");
  picker.className = "emoji-picker-popover";
  picker.setAttribute("contenteditable", "false");

  const icons = [
    "description", "lightbulb", "push_pin", "warning",
    "rocket_launch", "target", "local_fire_department",
    "check_circle", "info", "calendar_month",
    "terminal", "palette", "star", "favorite", "notifications"
  ];

  const grid = document.createElement("div");
  grid.className = "emoji-picker-grid";

  icons.forEach(iconName => {
    const btn = document.createElement("button");
    btn.className = "emoji-picker-btn material-symbols-outlined";
    btn.textContent = iconName;
    btn.title = iconName;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      blockIcon.setAttribute("data-icon", iconName);
      blockIcon.textContent = iconName;
      closeAllEmojiPickers();
      hasUnsavedChanges = true;
      updateUnsavedIndicator();
    });
    grid.appendChild(btn);
  });

  picker.appendChild(grid);

  const clearBtn = document.createElement("button");
  clearBtn.className = "emoji-picker-clear-btn";
  clearBtn.textContent = prefs.lang === "ru" ? "Удалить иконку" : "Remove icon";
  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    blockIcon.setAttribute("data-icon", "");
    blockIcon.textContent = "";
    closeAllEmojiPickers();
    hasUnsavedChanges = true;
    updateUnsavedIndicator();
  });
  picker.appendChild(clearBtn);

  header.appendChild(picker);

  activeOutsideClickFn = (e) => {
    if (!picker.contains(e.target) && e.target !== blockIcon) {
      closeAllEmojiPickers();
    }
  };

  setTimeout(() => {
    document.addEventListener("click", activeOutsideClickFn);
  }, 0);
}

function closeAllEmojiPickers() {
  document.querySelectorAll(".emoji-picker-popover").forEach(p => p.remove());
  if (activeOutsideClickFn) {
    document.removeEventListener("click", activeOutsideClickFn);
    activeOutsideClickFn = null;
  }
}

// Превращает текстовые URL в кликабельные HTML-ссылки
function linkifyHtml(html) {
  if (!html) return "";
  // Сначала убираем старые ссылки, чтобы избежать вложенных или дублирующихся тегов <a>
  const clean = unlinkifyHtml(html);
  
  // Регулярное выражение для поиска URL-адресов (http:// или https://)
  const urlPattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  return clean.replace(urlPattern, '<a href="$1" class="editor-link" target="_blank">$1</a>');
}

// Убирает теги <a>, превращая их обратно в простой текст
function unlinkifyHtml(html) {
  if (!html) return "";
  return html.replace(/<a\b[^>]*[^>]*>(.*?)<\/a>/ig, '$1');
}



