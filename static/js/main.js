/* ==========================================================================
   PARONIDECK - FRONT-END CONTROLLER (JS ATUALIZADO)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const statusCard = document.getElementById('status-card');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const serverAddress = document.getElementById('server-address');
    const soundGrid = document.getElementById('sound-grid');
    
    // Botão Expandir (Apenas Mobile)
    const btnExpandDeck = document.getElementById('btn-expand-deck');
    const iconExpand = document.getElementById('icon-expand');
    const labelExpand = document.getElementById('label-expand');
    
    // Botão Girar Tela (Apenas Mobile)
    const btnRotateDeck = document.getElementById('btn-rotate-deck');
    const iconRotate = document.getElementById('icon-rotate');

    // Modo Edição & Gaveta (Drawer)
    const btnEditMode = document.getElementById('btn-edit-mode');
    const btnAddSound = document.getElementById('btn-add-sound');
    const editDrawer = document.getElementById('edit-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const editForm = document.getElementById('edit-button-form');
    const iconPickerGrid = document.getElementById('icon-picker-grid');
    
    const editSoundIndex = document.getElementById('edit-sound-index');
    const editSoundName = document.getElementById('edit-sound-name');
    const editSoundSpId = document.getElementById('edit-sound-sp-id');
    const editSoundCategory = document.getElementById('edit-sound-category');
    const newCategoryInputGroup = document.getElementById('new-category-input-group');
    const editSoundNewCategory = document.getElementById('edit-sound-new-category');
    const editSoundPage = document.getElementById('edit-sound-page');
    const editSoundImage = document.getElementById('edit-sound-image');
    
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const btnRemoveImage = document.getElementById('btn-remove-image');
    const btnDeleteSound = document.getElementById('btn-delete-sound');

    // Mapeamento dos novos campos de ações
    const editActionType = document.getElementById('edit-action-type');
    const groupSoundpad = document.getElementById('group-soundpad');
    const groupLink = document.getElementById('group-link');
    const groupDiscord = document.getElementById('group-discord');
    const editLinkUrl = document.getElementById('edit-link-url');
    const editDiscordAction = document.getElementById('edit-discord-action');
    const groupKey = document.getElementById('group-key');
    const editKeyCode = document.getElementById('edit-key-code');
    const groupMediaControl = document.getElementById('group-media-control');
    const editMediaAction = document.getElementById('edit-media-action');
    const editMediaTarget = document.getElementById('edit-media-target');


    // Mapeamento de Configurações Globais
    const btnGlobalSettings = document.getElementById('btn-global-settings');
    const settingsDrawer = document.getElementById('settings-drawer');
    const btnCloseSettingsDrawer = document.getElementById('btn-close-settings-drawer');
    const globalSettingsForm = document.getElementById('global-settings-form');
    const settingsServerPort = document.getElementById('settings-server-port');


    // Estado da Aplicação
    let allSounds = [];
    let serverCategories = [];
    let currentPage = 1;
    let totalPages = 1;
    let initialLoadDone = false;
    let isEditing = false;
    let currentlyPlayingId = null;
    let base64ImageData = null;
    let currentFolderId = null;

    // Ícones pré-definidos para escolha no editor
    const PREDEFINED_ICONS = [
        'bell', 'megaphone', 'party-popper', 'laugh', 'frown', 
        'bomb', 'trophy', 'zap', 'ghost', 'drum', 
        'message-square', 'alert-triangle', 'volume-2', 'music', 
        'play', 'mic', 'disc', 'activity', 'smile', 'flame',
        'heart', 'skull', 'gamepad-2', 'check-circle', 'folder',
        'skip-forward', 'skip-back'
    ];

    // Inicializar o Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Gerar grid de seleção de ícones no editor
    function renderIconPicker() {
        iconPickerGrid.innerHTML = PREDEFINED_ICONS.map(icon => `
            <label class="icon-option" title="${icon}">
                <input type="radio" name="edit-icon" value="${icon}">
                <div class="icon-box">
                    <i data-lucide="${icon}"></i>
                </div>
            </label>
        `).join('');
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
    renderIconPicker();

    // Atualiza status de conexão
    function updateStatusUI(found, running) {
        statusCard.className = 'status-card';
        if (!found) {
            statusCard.classList.add('status-disconnected');
            statusText.textContent = 'Soundpad não instalado';
        } else if (!running) {
            statusCard.classList.add('status-disconnected');
            statusText.textContent = 'Soundpad fechado';
        } else {
            statusCard.classList.add('status-connected');
            statusText.textContent = 'Soundpad Conectado';
        }
    }

    // Popula o select de categorias no editor
    function populateCategorySelect(categories) {
        const currentValue = editSoundCategory.value;
        editSoundCategory.innerHTML = '<option value="">Sem Categoria (Global)</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.name} (${cat.count})`;
            editSoundCategory.appendChild(option);
        });
        
        // Opção para adicionar categoria customizada
        const optionNew = document.createElement('option');
        optionNew.value = '__NEW_CATEGORY__';
        optionNew.textContent = '+ Adicionar Nova Categoria...';
        editSoundCategory.appendChild(optionNew);

        if (currentValue && (categories.some(c => c.name === currentValue) || currentValue === '__NEW_CATEGORY__')) {
            editSoundCategory.value = currentValue;
        }
    }

    // Algoritmo de Agrupamento das Páginas (Estilo Steam Deck)
    // Distribui os sons em páginas de 12 slots, inserindo botões de paginação quando aplicável.
    function chunkSoundsIntoPages(sounds) {
        const pages = [];
        let soundIndex = 0;
        let pageNumber = 1;
        
        if (sounds.length === 0) {
            pages.push(new Array(12).fill({ type: 'empty' }));
            return pages;
        }

        while (soundIndex < sounds.length) {
            const pageItems = new Array(12).fill(null);
            
            const hasPrev = pageNumber > 1;
            // Verifica se sobram mais sons do que cabem na página (descontando o botão "voltar" se houver)
            const hasNextIndex = (sounds.length - soundIndex) > (12 - (hasPrev ? 1 : 0));
            
            // Slot 0 (primeiro botão) = Voltar Página
            if (hasPrev) {
                pageItems[0] = { type: 'prev-page' };
            }
            
            // Slot 11 (último botão) = Próxima Página
            if (hasNextIndex) {
                pageItems[11] = { type: 'next-page' };
            }
            
            const startSlot = hasPrev ? 1 : 0;
            const endSlot = hasNextIndex ? 10 : 11;
            
            // Preencher os slots do meio com os sons configurados
            for (let slot = startSlot; slot <= endSlot; slot++) {
                if (soundIndex < sounds.length) {
                    pageItems[slot] = { type: 'sound', sound: sounds[soundIndex] };
                    soundIndex++;
                } else {
                    pageItems[slot] = { type: 'empty' };
                }
            }
            
            // Preencher eventuais slots nulos remanescentes
            for (let i = 0; i < 12; i++) {
                if (pageItems[i] === null) {
                    pageItems[i] = { type: 'empty' };
                }
            }
            
            pages.push(pageItems);
            pageNumber++;
        }
        return pages;
    }

    // Navegar de volta na árvore de pastas
    function goBackFolder() {
        if (currentFolderId === null) return;
        const currentFolder = allSounds.find(s => s.id === currentFolderId);
        currentFolderId = currentFolder ? (currentFolder.parentFolder || null) : null;
        currentPage = 1;
        renderSoundGrid();
    }

    // Excluir recursivamente filhos de uma pasta
    function deleteFolderRecursive(folderId) {
        const children = allSounds.filter(s => s.parentFolder === folderId);
        children.forEach(child => {
            if (child.type === 'folder') {
                deleteFolderRecursive(child.id);
            }
            const idx = allSounds.indexOf(child);
            if (idx !== -1) {
                allSounds.splice(idx, 1);
            }
        });
    }

    // Renderiza a Grid baseada nas páginas geradas
    function renderSoundGrid() {
        soundGrid.innerHTML = '';
        
        // Filtrar sons pertencentes à pasta atual
        let filteredSounds = allSounds.filter(sound => {
            const parent = sound.parentFolder || null;
            return parent === currentFolderId;
        });

        // Se estiver dentro de uma pasta, prepende o botão virtual "Voltar"
        if (currentFolderId !== null) {
            filteredSounds.unshift({
                type: 'back',
                name: 'Voltar',
                icon: 'arrow-left',
                color: '#64748b'
            });
        }

        // Se for mobile, adiciona o botão "+" ao final de filteredSounds (sempre ativo)
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
            filteredSounds.push({
                type: 'add-new',
                name: 'Adicionar',
                icon: 'plus',
                color: '#10b981'
            });
        }
        
        // Chunkar a lista filtrada dinamicamente
        const pages = chunkSoundsIntoPages(filteredSounds);
        totalPages = pages.length;

        // Garante que a página atual não extrapolou
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const currentPageItems = pages[currentPage - 1] || [];

        currentPageItems.forEach((item, slotIndex) => {
            const card = document.createElement('div');
            
            if (item.type === 'empty') {
                // Renderizar slot vazio
                card.className = 'sound-card sound-card-empty';
                card.innerHTML = `<span></span>`;
                soundGrid.appendChild(card);
            } 
            else if (item.type === 'prev-page') {
                // Renderizar botão Voltar Página (Steam Deck style)
                card.className = 'sound-card btn-nav-page';
                card.innerHTML = `
                    <div class="sound-icon-wrapper">
                        <i data-lucide="chevron-left"></i>
                    </div>
                    <span class="sound-title">Voltar Página</span>
                `;
                card.addEventListener('click', () => {
                    if (currentPage > 1) {
                        currentPage--;
                        renderSoundGrid();
                    }
                });
                soundGrid.appendChild(card);
            } 
            else if (item.type === 'next-page') {
                // Renderizar botão Próxima Página (Steam Deck style)
                card.className = 'sound-card btn-nav-page';
                card.innerHTML = `
                    <div class="sound-icon-wrapper">
                        <i data-lucide="chevron-right"></i>
                    </div>
                    <span class="sound-title">Próxima Página</span>
                `;
                card.addEventListener('click', () => {
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderSoundGrid();
                    }
                });
                soundGrid.appendChild(card);
            } 
            else if (item.type === 'sound') {
                const sound = item.sound;
                
                // Tratar botão virtual Voltar Pasta
                if (sound.type === 'back') {
                    card.className = 'sound-card btn-back-card';
                    card.innerHTML = `
                        <div class="sound-icon-wrapper">
                            <i data-lucide="arrow-left"></i>
                        </div>
                        <span class="sound-title">Voltar</span>
                    `;
                    card.addEventListener('click', () => {
                        goBackFolder();
                    });
                    soundGrid.appendChild(card);
                    return;
                }

                // Tratar botão virtual Adicionar Novo (apenas mobile)
                if (sound.type === 'add-new') {
                    card.className = 'sound-card btn-add-card';
                    card.style.setProperty('--card-glow-color', sound.color || '#10b981');
                    card.style.setProperty('--card-glow-rgba', `${sound.color || '#10b981'}33`);
                    card.innerHTML = `
                        <div class="sound-icon-wrapper">
                            <i data-lucide="plus"></i>
                        </div>
                        <span class="sound-title">${sound.name}</span>
                    `;
                    card.addEventListener('click', () => {
                        openNewActionEditor();
                    });
                    soundGrid.appendChild(card);
                    return;
                }

                const absoluteIndex = allSounds.findIndex(s => s === sound);

                card.className = 'sound-card';
                card.setAttribute('data-id', sound.id);
                card.setAttribute('data-index', absoluteIndex);
                
                card.style.setProperty('--card-glow-color', sound.color || '#a855f7');
                card.style.setProperty('--card-glow-rgba', `${sound.color || '#a855f7'}33`);

                if (sound.type === 'folder') {
                    card.classList.add('sound-card-folder');
                }

                let graphicHtml = '';
                if (sound.image) {
                    graphicHtml = `<img src="${sound.image}" class="sound-custom-img" alt="${sound.name}">`;
                } else {
                    graphicHtml = `
                        <div class="sound-icon-wrapper">
                            <i data-lucide="${sound.icon || 'volume-2'}"></i>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="sound-card-edit-badge" title="Editar">
                        <i data-lucide="edit-2"></i>
                    </div>
                    ${sound.category ? `<span class="sound-category" title="${sound.category}">${sound.category}</span>` : ''}
                    ${sound.type === 'soundpad' && sound.id !== undefined && sound.id !== null ? `<span class="sound-index">#${sound.id}</span>` : ''}
                    ${graphicHtml}
                    <span class="sound-title">${sound.name}</span>
                `;

                // Variáveis de controle para o gesto de pressionar e segurar (long press)
                let pressTimer = null;
                let isLongPress = false;
                let startX = 0;
                let startY = 0;

                // Eventos de Mouse (Desktop)
                card.addEventListener('mousedown', (e) => {
                    if (isEditing) return;
                    if (e.button !== 0) return; // Apenas clique esquerdo
                    
                    isLongPress = false;
                    if (pressTimer) clearTimeout(pressTimer);
                    
                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        // Para o som atualmente tocando no Soundpad
                        sendControlAction('stop');
                        document.querySelectorAll('.sound-card.is-playing').forEach(c => {
                            c.classList.remove('is-playing', 'is-paused');
                        });
                        currentlyPlayingId = null;
                        showToast('Som parado');
                    }, 600);
                });

                card.addEventListener('mouseup', (e) => {
                    if (isEditing) return;
                    if (e.button !== 0) return;
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                });

                card.addEventListener('mouseleave', () => {
                    if (isEditing) return;
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                });

                // Eventos de Toque (Mobile)
                card.addEventListener('touchstart', (e) => {
                    if (isEditing) return;
                    isLongPress = false;
                    if (e.touches && e.touches[0]) {
                        startX = e.touches[0].clientX;
                        startY = e.touches[0].clientY;
                    }
                    if (pressTimer) clearTimeout(pressTimer);
                    
                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        sendControlAction('stop');
                        document.querySelectorAll('.sound-card.is-playing').forEach(c => {
                            c.classList.remove('is-playing', 'is-paused');
                        });
                        currentlyPlayingId = null;
                        showToast('Som parado');
                    }, 600);
                }, { passive: true });

                card.addEventListener('touchmove', (e) => {
                    if (isEditing) return;
                    if (pressTimer && e.touches && e.touches[0]) {
                        const moveX = e.touches[0].clientX;
                        const moveY = e.touches[0].clientY;
                        // Cancela o long press se mover o dedo mais de 10px (evita disparar ao rolar a página)
                        if (Math.hypot(moveX - startX, moveY - startY) > 10) {
                            clearTimeout(pressTimer);
                            pressTimer = null;
                        }
                    }
                }, { passive: true });

                card.addEventListener('touchend', (e) => {
                    if (isEditing) return;
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                    if (isLongPress) {
                        e.preventDefault(); // Evita cliques fantasmas ou zooms
                    }
                });

                card.addEventListener('touchcancel', () => {
                    if (isEditing) return;
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                });

                // Previne o menu de contexto padrão ao segurar o botão
                card.addEventListener('contextmenu', (e) => {
                    if (!isEditing) {
                        e.preventDefault();
                    }
                });

                card.addEventListener('click', () => {
                    if (isEditing) {
                        openEditor(absoluteIndex);
                    } else {
                        if (isLongPress) {
                            isLongPress = false; // Consome o evento e reseta
                            return;
                        }
                        if (sound.type === 'folder') {
                            currentFolderId = sound.id;
                            currentPage = 1;
                            renderSoundGrid();
                        } else if (sound.type === 'soundpad' || !sound.type) {
                            // Toca o som a partir do zero
                            document.querySelectorAll('.sound-card.is-playing').forEach(c => {
                                c.classList.remove('is-playing', 'is-paused');
                            });
                            triggerSound(sound, card);
                            currentlyPlayingId = sound.id;
                            card.classList.add('is-playing');
                        } else {
                            // Ações que não são do Soundpad (OBS, Link, Discord, teclas)
                            triggerSound(sound, card);
                        }
                    }
                });

                soundGrid.appendChild(card);
            }
        });

        // Atualizar os ícones do Lucide nos novos botões injetados
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Busca status de rede e do Soundpad
    async function fetchServerStatus(forceGridRefresh = false) {
        try {
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error('Falha na resposta do servidor');
            
            const data = await response.json();
            
            updateStatusUI(data.soundpad_found, data.soundpad_running);
            serverAddress.textContent = `${data.server_ip}:${data.server_port}`;
            
            allSounds = data.sounds;
            serverCategories = data.categories || [];
            populateCategorySelect(serverCategories);

            // Preencher campos de configurações globais se a gaveta não estiver aberta
            if (!settingsDrawer.classList.contains('open')) {
                settingsServerPort.value = data.server_port || 5000;


            }
            
            // Só recarrega a grid no primeiro load ou se explicitamente requisitado
            if (!initialLoadDone || forceGridRefresh) {
                renderSoundGrid();
                initialLoadDone = true;
            }
        } catch (error) {
            console.error('Erro ao conectar ao servidor backend:', error);
            statusCard.className = 'status-card status-disconnected';
            statusText.textContent = 'Sem conexão com Servidor';
            serverAddress.textContent = 'Desconectado';
            
            if (!initialLoadDone) {
                soundGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--accent-red);">
                        Não foi possível conectar ao servidor. Verifique se o server.js está rodando.
                    </div>
                `;
            }
        }
    }

    // Dispara a ação do card (Soundpad, OBS, Link, Discord)
    async function triggerSound(sound, cardElement) {
        cardElement.classList.remove('playing-flash');
        void cardElement.offsetWidth;
        cardElement.classList.add('playing-flash');

        try {
            const response = await fetch('/api/trigger-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sound)
            });
            const result = await response.json();
            if (!result.success) {
                showToast(result.message || result.error || 'Ação falhou');
                fetchServerStatus();
            }
        } catch (error) {
            console.error('Erro ao acionar ação:', error);
            showToast('Erro de conexão ao disparar ação.');
        }
    }

    // Controles Globais (Parar, Pausar)
    async function sendControlAction(action) {
        try {
            const response = await fetch('/api/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
            const result = await response.json();
            if (!result.success) {
                showToast(result.message || 'Ação falhou');
                fetchServerStatus();
            } else {
                if (action === 'toggle-pause') {
                    const isPausing = labelPause.textContent === 'Pausar';
                    labelPause.textContent = isPausing ? 'Retomar' : 'Pausar';
                    iconPause.setAttribute('data-lucide', isPausing ? 'play' : 'pause');
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        } catch (error) {
            console.error(`Erro na ação ${action}:`, error);
            showToast('Erro de conexão com o servidor.');
        }
    }

    // Alternar Modo de Edição (Apenas PC)
    btnEditMode.addEventListener('click', () => {
        isEditing = !isEditing;
        btnEditMode.classList.toggle('active', isEditing);
        document.body.classList.toggle('edit-active', isEditing);
        
        // Exibir/Esconder botão de adicionar novo som
        btnAddSound.style.display = isEditing ? 'flex' : 'none';

        if (isEditing) {
            showToast('Modo de Edição Ativo. Clique em qualquer botão para editá-lo ou em "+ Adicionar Ação".');
        } else {
            closeEditorDrawer();
        }
    });

    // Abrir/Fechar Gaveta de Configurações Gerais
    btnGlobalSettings.addEventListener('click', () => {
        settingsDrawer.classList.add('open');
    });

    btnCloseSettingsDrawer.addEventListener('click', () => {
        settingsDrawer.classList.remove('open');
    });

    // Salvar Configurações Gerais
    globalSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            port: parseInt(settingsServerPort.value)
        };

        try {
            const response = await fetch('/api/save-global-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.success) {
                showToast('Configurações globais salvas com sucesso!');
                settingsDrawer.classList.remove('open');
                fetchServerStatus(true);
            } else {
                showToast('Erro ao salvar: ' + result.error);
            }
        } catch (err) {
            console.error('Erro ao salvar configurações gerais:', err);
            showToast('Erro de conexão ao salvar configurações.');
        }
    });

    // Monitorar mudança na categoria para exibir campo de nova categoria
    editSoundCategory.addEventListener('change', () => {
        if (editSoundCategory.value === '__NEW_CATEGORY__') {
            newCategoryInputGroup.style.display = 'block';
            editSoundNewCategory.required = true;
            editSoundNewCategory.focus();
        } else {
            newCategoryInputGroup.style.display = 'none';
            editSoundNewCategory.required = false;
        }
    });

    // Funções para exibir campos conforme tipo de ação do botão
    function toggleActionFormFields() {
        const type = editActionType.value;
        groupSoundpad.style.display = type === 'soundpad' ? 'block' : 'none';
        groupLink.style.display = type === 'link' ? 'block' : 'none';
        groupDiscord.style.display = type === 'discord' ? 'block' : 'none';
        groupKey.style.display = type === 'key' ? 'block' : 'none';
        groupMediaControl.style.display = type === 'media_control' ? 'block' : 'none';
    }

    editActionType.addEventListener('change', toggleActionFormFields);



    // Função reutilizável para abrir o editor de nova ação
    function openNewActionEditor() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (isMobile) {
            openMobileEditor(-1);
            return;
        }

        editSoundIndex.value = -1;
        editSoundName.value = '';
        editActionType.value = 'soundpad';
        
        editSoundSpId.value = '';
        editSoundCategory.value = '';
        editSoundNewCategory.value = '';
        newCategoryInputGroup.style.display = 'none';
        editSoundNewCategory.required = false;



        editLinkUrl.value = '';
        editDiscordAction.value = 'toggle-mute';
        editKeyCode.value = '124';
        editMediaAction.value = 'Media_Play_Pause';
        editMediaTarget.value = 'global';

        toggleActionFormFields();

        editSoundPage.value = currentPage;
        base64ImageData = null;
        editSoundImage.value = '';
        imagePreviewContainer.style.display = 'none';

        btnDeleteSound.style.display = 'none';

        const purpleColor = document.querySelector('input[name="edit-color"][value="#a855f7"]');
        if (purpleColor) purpleColor.checked = true;

        const defaultIcon = document.querySelector('input[name="edit-icon"][value="volume-2"]');
        if (defaultIcon) defaultIcon.checked = true;

        editDrawer.classList.add('open');
    }

    // Abrir Editor para Criar Novo Som (botão desktop)
    btnAddSound.addEventListener('click', () => {
        openNewActionEditor();
    });

    // Abrir Panel de Edição do Botão Selecionado
    function openEditor(absoluteIndex) {
        const sound = allSounds[absoluteIndex];
        if (!sound) return;

        editSoundIndex.value = absoluteIndex;
        editSoundName.value = sound.name || '';
        
        // Configurar Tipo de Ação
        const type = sound.type || 'soundpad';
        editActionType.value = type;

        // Carregar campos Soundpad
        editSoundSpId.value = sound.id || '';
        let catName = '';
        if (sound.category) {
            if (typeof sound.category === 'number') {
                const found = serverCategories.find(c => c.index === sound.category);
                catName = found ? found.name : '';
            } else {
                catName = sound.category;
            }
        }
        
        if (catName) {
            const exists = Array.from(editSoundCategory.options).some(opt => opt.value === catName);
            if (exists) {
                editSoundCategory.value = catName;
                newCategoryInputGroup.style.display = 'none';
                editSoundNewCategory.required = false;
                editSoundNewCategory.value = '';
            } else {
                editSoundCategory.value = '__NEW_CATEGORY__';
                newCategoryInputGroup.style.display = 'block';
                editSoundNewCategory.required = true;
                editSoundNewCategory.value = catName;
            }
        } else {
            editSoundCategory.value = '';
            newCategoryInputGroup.style.display = 'none';
            editSoundNewCategory.required = false;
            editSoundNewCategory.value = '';
        }



        // Carregar campos Link, Discord e Personalizado
        editLinkUrl.value = sound.linkUrl || '';
        editDiscordAction.value = sound.discordAction || 'toggle-mute';
        editKeyCode.value = sound.keyCode || '124';
        editMediaAction.value = sound.mediaAction || 'Media_Play_Pause';
        editMediaTarget.value = sound.mediaTarget || 'global';

        toggleActionFormFields();
        
        editSoundPage.value = sound.page || 1;
        base64ImageData = null;
        editSoundImage.value = '';

        // Exibe botão de exclusão para sons existentes
        btnDeleteSound.style.display = 'flex';

        const colorInput = document.querySelector(`input[name="edit-color"][value="${sound.color || '#a855f7'}"]`);
        if (colorInput) colorInput.checked = true;

        const iconInput = document.querySelector(`input[name="edit-icon"][value="${sound.icon || 'volume-2'}"]`);
        if (iconInput) iconInput.checked = true;

        if (sound.image) {
            imagePreview.src = sound.image;
            imagePreviewContainer.style.display = 'flex';
        } else {
            imagePreviewContainer.style.display = 'none';
        }

        editDrawer.classList.add('open');
    }

    function closeEditorDrawer() {
        editDrawer.classList.remove('open');
    }

    btnCloseDrawer.addEventListener('click', closeEditorDrawer);

    // Evento ao carregar arquivo de Imagem
    editSoundImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            base64ImageData = event.target.result;
            imagePreview.src = base64ImageData;
            imagePreviewContainer.style.display = 'flex';
            
            const checkedIcon = document.querySelector('input[name="edit-icon"]:checked');
            if (checkedIcon) checkedIcon.checked = false;
        };
        reader.readAsDataURL(file);
    });

    // Remover Imagem Customizada do Botão
    btnRemoveImage.addEventListener('click', () => {
        base64ImageData = null;
        editSoundImage.value = '';
        imagePreviewContainer.style.display = 'none';
        
        const defaultIcon = document.querySelector('input[name="edit-icon"][value="volume-2"]');
        if (defaultIcon) defaultIcon.checked = true;
    });

    // Excluir Som do Deck
    btnDeleteSound.addEventListener('click', async () => {
        const absoluteIndex = parseInt(editSoundIndex.value);
        if (isNaN(absoluteIndex) || absoluteIndex === -1 || !allSounds[absoluteIndex]) return;

        const soundToDelete = allSounds[absoluteIndex];
        const isFolder = soundToDelete.type === 'folder';
        const msg = isFolder 
            ? `Deseja realmente excluir a pasta "${soundToDelete.name}"? Todos os botões e subpastas dentro dela serão excluídos permanentemente.`
            : `Deseja realmente excluir a ação "${soundToDelete.name}" do deck?`;

        if (confirm(msg)) {
            if (isFolder) {
                deleteFolderRecursive(soundToDelete.id);
            }
            allSounds.splice(absoluteIndex, 1);

            try {
                const saveResponse = await fetch('/api/save-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sounds: allSounds })
                });
                
                const saveResult = await saveResponse.json();
                if (saveResult.success) {
                    showToast(isFolder ? 'Pasta e seu conteúdo removidos!' : 'Ação removida do deck!');
                    closeEditorDrawer();
                    fetchServerStatus(true);
                } else {
                    showToast('Erro ao salvar: ' + saveResult.error);
                }
            } catch (err) {
                console.error('Erro ao excluir som:', err);
                showToast('Erro de conexão com o servidor.');
            }
        }
    });

    // Salvar Alterações do Formulário de Edição
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const absoluteIndex = parseInt(editSoundIndex.value);
        if (isNaN(absoluteIndex)) return;

        const name = editSoundName.value.trim();
        const type = editActionType.value;
        const page = parseInt(editSoundPage.value);
        const color = document.querySelector('input[name="edit-color"]:checked')?.value || '#a855f7';
        
        let icon = null;
        const iconRadio = document.querySelector('input[name="edit-icon"]:checked');
        if (iconRadio) icon = iconRadio.value;

        // Estrutura base de dados do botão
        let soundData = {
            type: type,
            name: name,
            page: page,
            color: color,
            icon: icon || 'volume-2',
            image: null
        };

        if (type === 'soundpad') {
            soundData.id = parseInt(editSoundSpId.value) || 1;
            let selectedCategory = editSoundCategory.value || null;
            if (selectedCategory === '__NEW_CATEGORY__') {
                selectedCategory = editSoundNewCategory.value.trim() || null;
            }
            soundData.category = selectedCategory;
        } 
 
        else if (type === 'link') {
            soundData.linkUrl = editLinkUrl.value.trim();
            if (!icon) soundData.icon = 'external-link';
        } 
        else if (type === 'discord') {
            soundData.discordAction = editDiscordAction.value;
            if (!icon) soundData.icon = 'mic-off';
        }
        else if (type === 'key') {
            soundData.keyCode = parseInt(editKeyCode.value);
            if (!icon) soundData.icon = 'keyboard';
        }
        else if (type === 'media_control') {
            soundData.mediaAction = editMediaAction.value;
            soundData.mediaTarget = editMediaTarget.value;
            if (!icon) {
                if (soundData.mediaAction === 'Media_Play_Pause') {
                    soundData.icon = 'play';
                } else if (soundData.mediaAction === 'Media_Next') {
                    soundData.icon = 'skip-forward';
                } else if (soundData.mediaAction === 'Media_Prev') {
                    soundData.icon = 'skip-back';
                } else {
                    soundData.icon = 'music';
                }
            }
        }
        else if (type === 'folder') {
            if (absoluteIndex === -1) {
                soundData.id = 'folder_' + Date.now();
            } else {
                soundData.id = allSounds[absoluteIndex].id || ('folder_' + Date.now());
            }
            if (!icon) soundData.icon = 'folder';
        }

        let sound;
        if (absoluteIndex === -1) {
            soundData.parentFolder = currentFolderId;
            sound = soundData;
        } else {
            sound = allSounds[absoluteIndex];
            // Remove propriedades antigas de outros tipos
            const keysToKeep = ['image', 'parentFolder'];
            Object.keys(sound).forEach(key => {
                if (!keysToKeep.includes(key)) {
                    delete sound[key];
                }
            });
            Object.assign(sound, soundData);
        }
        
        // Fazer upload de imagem se houver
        if (base64ImageData && editSoundImage.files.length > 0) {
            const file = editSoundImage.files[0];
            try {
                const uploadResponse = await fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: file.name,
                        data: base64ImageData
                    })
                });
                
                const uploadResult = await uploadResponse.json();
                if (uploadResult.success) {
                    sound.image = uploadResult.url;
                } else {
                    showToast('Falha ao subir imagem: ' + uploadResult.error);
                    return;
                }
            } catch (err) {
                console.error('Erro de upload:', err);
                showToast('Erro de conexão ao enviar a imagem.');
                return;
            }
        } else if (imagePreviewContainer.style.display === 'none') {
            sound.image = null;
        }

        // Se uma imagem foi customizada, preservamos ela e não forçamos ícone
        if (sound.image) {
            sound.icon = null;
        }

        if (absoluteIndex === -1) {
            allSounds.push(sound);
        }

        try {
            const saveResponse = await fetch('/api/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sounds: allSounds })
            });
            
            const saveResult = await saveResponse.json();
            if (saveResult.success) {
                showToast('Deck configurado com sucesso!');
                closeEditorDrawer();
                fetchServerStatus(true);
            } else {
                showToast('Erro ao salvar: ' + saveResult.error);
            }
        } catch (err) {
            console.error('Erro ao salvar deck:', err);
            showToast('Erro ao gravar configurações.');
        }
    });

    // Notificação rápida na tela (Toast)
    function showToast(message) {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.background = 'rgba(15, 10, 30, 0.9)';
            toast.style.color = '#fda4af';
            toast.style.padding = '0.75rem 1.25rem';
            toast.style.borderRadius = '30px';
            toast.style.border = '1px solid rgba(244, 63, 94, 0.4)';
            toast.style.fontSize = '0.8rem';
            toast.style.fontWeight = '600';
            toast.style.zIndex = '9999';
            toast.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.5)';
            toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            toast.style.textAlign = 'center';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
        }, 3000);
    }

    // Vincular botão de expandir
    if (btnExpandDeck) {
        btnExpandDeck.addEventListener('click', () => {
            const isExpanded = document.body.classList.toggle('expanded-active');
            
            if (isExpanded) {
                labelExpand.textContent = 'Recolher';
                iconExpand.setAttribute('data-lucide', 'minimize-2');
            } else {
                labelExpand.textContent = 'Expandir';
                iconExpand.setAttribute('data-lucide', 'maximize-2');
            }
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    }

    // Inicializar rotação mobile (se houver preferência salva)
    let currentRotation = localStorage.getItem('mobile-rotation') || '90';
    if (currentRotation === '270') {
        document.body.classList.add('rotate-270');
    }

    // Vincular botão de girar tela (Mobile)
    if (btnRotateDeck) {
        btnRotateDeck.addEventListener('click', () => {
            const hasRotate270 = document.body.classList.toggle('rotate-270');
            localStorage.setItem('mobile-rotation', hasRotate270 ? '270' : '90');
            showToast(hasRotate270 ? 'Tela invertida (270°)' : 'Tela na rotação padrão (90°)');
        });
    }

    // Recarregar grid em caso de redimensionamento de janela (mudança de PC/Mobile)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            renderSoundGrid();
        }, 150);
    });

    // ========================================================================
    // PAINEL DE EDIÇÃO MOBILE (Lógica exclusiva para celular)
    // ========================================================================
    const mobileOverlay = document.getElementById('mobile-editor-overlay');
    const mobileHeading = document.getElementById('mobile-editor-heading');
    const btnCloseMobile = document.getElementById('btn-close-mobile-editor');
    const mobileEditForm = document.getElementById('mobile-edit-form');
    const mobileEditIndex = document.getElementById('mobile-edit-index');
    const mobileEditName = document.getElementById('mobile-edit-name');
    const mobileEditActionType = document.getElementById('mobile-edit-action-type');
    const mobileGroupSoundpad = document.getElementById('mobile-group-soundpad');
    const mobileEditSpId = document.getElementById('mobile-edit-sp-id');
    const mobileEditCategory = document.getElementById('mobile-edit-category');

    const mobileGroupLink = document.getElementById('mobile-group-link');
    const mobileEditLinkUrl = document.getElementById('mobile-edit-link-url');
    const mobileGroupDiscord = document.getElementById('mobile-group-discord');
    const mobileEditDiscordAction = document.getElementById('mobile-edit-discord-action');
    const mobileGroupKey = document.getElementById('mobile-group-key');
    const mobileEditKeyCode = document.getElementById('mobile-edit-key-code');

    const mobileBtnDelete = document.getElementById('mobile-btn-delete');
    const mobileIconPickerGrid = document.getElementById('mobile-icon-picker-grid');
    const mobileGroupMediaControl = document.getElementById('mobile-group-media-control');
    const mobileEditMediaAction = document.getElementById('mobile-edit-media-action');
    const mobileEditMediaTarget = document.getElementById('mobile-edit-media-target');

    // Gerar grid de ícones para o editor mobile
    if (mobileIconPickerGrid) {
        mobileIconPickerGrid.innerHTML = PREDEFINED_ICONS.map(icon => `
            <label class="icon-option" title="${icon}">
                <input type="radio" name="mobile-edit-icon" value="${icon}">
                <div class="icon-box">
                    <i data-lucide="${icon}"></i>
                </div>
            </label>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    }

    // Popula categorias no select mobile
    function populateMobileCategories() {
        if (!mobileEditCategory) return;
        mobileEditCategory.innerHTML = '<option value="">Sem Categoria (Global)</option>';
        serverCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.name} (${cat.count})`;
            mobileEditCategory.appendChild(option);
        });
    }

    // Alterna campos conforme tipo de ação (mobile)
    function toggleMobileActionFields() {
        if (!mobileEditActionType) return;
        const type = mobileEditActionType.value;
        mobileGroupSoundpad.style.display = type === 'soundpad' ? 'block' : 'none';
        mobileGroupLink.style.display = type === 'link' ? 'block' : 'none';
        mobileGroupDiscord.style.display = type === 'discord' ? 'block' : 'none';
        mobileGroupKey.style.display = type === 'key' ? 'block' : 'none';
        mobileGroupMediaControl.style.display = type === 'media_control' ? 'block' : 'none';
    }





    if (mobileEditActionType) mobileEditActionType.addEventListener('change', toggleMobileActionFields);



    // Abrir editor mobile (index = -1 para novo, >= 0 para editar existente)
    function openMobileEditor(absoluteIndex) {
        if (!mobileOverlay) return;

        populateMobileCategories();

        if (absoluteIndex === -1) {
            // Novo item
            mobileHeading.textContent = 'Nova Ação';
            mobileEditIndex.value = -1;
            mobileEditName.value = '';
            mobileEditActionType.value = 'soundpad';
            mobileEditSpId.value = '';
            mobileEditCategory.value = '';

            mobileEditLinkUrl.value = '';
            mobileEditDiscordAction.value = 'toggle-mute';
            mobileEditKeyCode.value = '124';
            mobileEditMediaAction.value = 'Media_Play_Pause';
            mobileEditMediaTarget.value = 'global';

            mobileBtnDelete.style.display = 'none';

            const purpleColor = document.querySelector('input[name="mobile-edit-color"][value="#a855f7"]');
            if (purpleColor) purpleColor.checked = true;
            const defaultIcon = document.querySelector('input[name="mobile-edit-icon"][value="volume-2"]');
            if (defaultIcon) defaultIcon.checked = true;
        } else {
            // Editar existente
            const sound = allSounds[absoluteIndex];
            if (!sound) return;
            mobileHeading.textContent = 'Editar Botão';
            mobileEditIndex.value = absoluteIndex;
            mobileEditName.value = sound.name || '';
            mobileEditActionType.value = sound.type || 'soundpad';
            mobileEditSpId.value = sound.id || '';
            mobileEditCategory.value = (typeof sound.category === 'string' ? sound.category : '') || '';

            mobileEditLinkUrl.value = sound.linkUrl || '';
            mobileEditDiscordAction.value = sound.discordAction || 'toggle-mute';
            mobileEditKeyCode.value = sound.keyCode || '124';
            mobileEditMediaAction.value = sound.mediaAction || 'Media_Play_Pause';
            mobileEditMediaTarget.value = sound.mediaTarget || 'global';

            mobileBtnDelete.style.display = 'flex';

            const colorInput = document.querySelector(`input[name="mobile-edit-color"][value="${sound.color || '#a855f7'}"]`);
            if (colorInput) colorInput.checked = true;
            const iconInput = document.querySelector(`input[name="mobile-edit-icon"][value="${sound.icon || 'volume-2'}"]`);
            if (iconInput) iconInput.checked = true;
        }

        toggleMobileActionFields();
        mobileOverlay.classList.add('open');
        if (window.lucide) window.lucide.createIcons();
    }

    function closeMobileEditor() {
        if (mobileOverlay) mobileOverlay.classList.remove('open');
    }

    if (btnCloseMobile) btnCloseMobile.addEventListener('click', closeMobileEditor);

    // Submit do formulário mobile
    if (mobileEditForm) {
        mobileEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const absoluteIndex = parseInt(mobileEditIndex.value);
            if (isNaN(absoluteIndex)) return;

            const name = mobileEditName.value.trim();
            const type = mobileEditActionType.value;
            const color = document.querySelector('input[name="mobile-edit-color"]:checked')?.value || '#a855f7';
            let icon = null;
            const iconRadio = document.querySelector('input[name="mobile-edit-icon"]:checked');
            if (iconRadio) icon = iconRadio.value;

            let soundData = {
                type: type,
                name: name,
                page: 1,
                color: color,
                icon: icon || 'volume-2',
                image: null
            };

            if (type === 'soundpad') {
                soundData.id = parseInt(mobileEditSpId.value) || 1;
                soundData.category = mobileEditCategory.value || null;

            } else if (type === 'link') {
                soundData.linkUrl = mobileEditLinkUrl.value.trim();
                if (!icon) soundData.icon = 'external-link';
            } else if (type === 'discord') {
                soundData.discordAction = mobileEditDiscordAction.value;
                if (!icon) soundData.icon = 'mic-off';
            } else if (type === 'key') {
                soundData.keyCode = parseInt(mobileEditKeyCode.value);
                if (!icon) soundData.icon = 'keyboard';
            } else if (type === 'media_control') {
                soundData.mediaAction = mobileEditMediaAction.value;
                soundData.mediaTarget = mobileEditMediaTarget.value;
                if (!icon) {
                    if (soundData.mediaAction === 'Media_Play_Pause') {
                        soundData.icon = 'play';
                    } else if (soundData.mediaAction === 'Media_Next') {
                        soundData.icon = 'skip-forward';
                    } else if (soundData.mediaAction === 'Media_Prev') {
                        soundData.icon = 'skip-back';
                    } else {
                        soundData.icon = 'music';
                    }
                }
            } else if (type === 'folder') {
                if (absoluteIndex === -1) {
                    soundData.id = 'folder_' + Date.now();
                } else {
                    soundData.id = allSounds[absoluteIndex].id || ('folder_' + Date.now());
                }
                if (!icon) soundData.icon = 'folder';
            }

            let sound;
            if (absoluteIndex === -1) {
                soundData.parentFolder = currentFolderId;
                sound = soundData;
                allSounds.push(sound);
            } else {
                sound = allSounds[absoluteIndex];
                const keysToKeep = ['image', 'parentFolder'];
                Object.keys(sound).forEach(key => {
                    if (!keysToKeep.includes(key)) delete sound[key];
                });
                Object.assign(sound, soundData);
            }

            try {
                const saveResponse = await fetch('/api/save-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sounds: allSounds })
                });
                const saveResult = await saveResponse.json();
                if (saveResult.success) {
                    showToast('Deck configurado com sucesso!');
                    closeMobileEditor();
                    fetchServerStatus(true);
                } else {
                    showToast('Erro ao salvar: ' + saveResult.error);
                }
            } catch (err) {
                console.error('Erro ao salvar deck (mobile):', err);
                showToast('Erro ao gravar configurações.');
            }
        });
    }

    // Excluir no mobile
    if (mobileBtnDelete) {
        mobileBtnDelete.addEventListener('click', async () => {
            const absoluteIndex = parseInt(mobileEditIndex.value);
            if (isNaN(absoluteIndex) || absoluteIndex === -1 || !allSounds[absoluteIndex]) return;

            const soundToDelete = allSounds[absoluteIndex];
            const isFolder = soundToDelete.type === 'folder';
            const msg = isFolder
                ? `Excluir a pasta "${soundToDelete.name}" e todo seu conteúdo?`
                : `Excluir "${soundToDelete.name}" do deck?`;

            if (confirm(msg)) {
                if (isFolder) deleteFolderRecursive(soundToDelete.id);
                allSounds.splice(absoluteIndex, 1);

                try {
                    const saveResponse = await fetch('/api/save-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sounds: allSounds })
                    });
                    const saveResult = await saveResponse.json();
                    if (saveResult.success) {
                        showToast(isFolder ? 'Pasta removida!' : 'Ação removida!');
                        closeMobileEditor();
                        fetchServerStatus(true);
                    } else {
                        showToast('Erro ao salvar: ' + saveResult.error);
                    }
                } catch (err) {
                    console.error('Erro ao excluir (mobile):', err);
                    showToast('Erro de conexão.');
                }
            }
        });
    }



    // Execução inicial e sincronização periódica
    fetchServerStatus();
    setInterval(() => {
        fetchServerStatus(false);
    }, 5000);
});
