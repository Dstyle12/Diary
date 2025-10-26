class DiaryDB {
    constructor() {
        this.dbName = 'DiaryAppDB';
        this.version = 2;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
 
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains('entries')) {
                    const entriesStore = db.createObjectStore('entries', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    entriesStore.createIndex('date', 'date', { unique: false });
                }

                if (!db.objectStoreNames.contains('photos')) {
                    const photosStore = db.createObjectStore('photos', { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    photosStore.createIndex('entryId', 'entryId', { unique: false });
                }
            };
        });
    }

    // Исправленный метод saveSettings
    async saveSettings(settings) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');

            const settingsObj = {
                id: 'diarySettings', 
                ...settings
            };
            
            const request = store.put(settingsObj);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get('diarySettings');
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Исправленный метод saveEntry
    async saveEntry(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readwrite');
            const store = transaction.objectStore('entries');
            const entryWithId = {
                id: entry.id || Date.now(), 
                ...entry
            };
            
            const request = store.put(entryWithId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadAllEntries() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['entries'], 'readonly');
            const store = transaction.objectStore('entries');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Исправленный метод savePhoto
    async savePhoto(photoData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const photoWithId = {
                id: photoData.id || `${photoData.entryId}_photo_${Date.now()}`,
                ...photoData
            };
            
            const request = store.put(photoWithId);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getPhotosByEntry(entryId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const index = store.index('entryId');
            const request = index.getAll(entryId);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }
}

class DiaryApp {
    constructor() {
        this.isRealTitle = false;
        this.currentBgImage = null;
        this.buttonGradientColor1 = '#FF6B6B';
        this.buttonGradientColor2 = '#4ECDC4';
        this.entries = [];
        this.currentPhotos = [];
        this.currentModalEntryId = null;
        this.currentModalPhotoIndex = 0;
        this.db = new DiaryDB();
        this.init();
    }

    async init() {
         try {
            console.log('Initializing DiaryApp with IndexedDB...');
            await this.db.init();
            console.log('IndexedDB initialized successfully');
            const settings = await this.db.loadSettings();
            console.log('Settings loaded:', settings);
            
            const entries = await this.db.loadAllEntries();
            console.log('Entries loaded:', entries);
            if (settings) {
                this.isRealTitle = settings.isRealTitle || false;
                
                if (settings.textColor) {
                    document.getElementById('textColorPicker').value = settings.textColor;
                }
                if (settings.bgColor) {
                    document.getElementById('bgColorPicker').value = settings.bgColor;
                }
                if (settings.buttonGradientColor1) {
                    this.buttonGradientColor1 = settings.buttonGradientColor1;
                    document.getElementById('buttonGradientColor1').value = settings.buttonGradientColor1;
                }
                if (settings.buttonGradientColor2) {
                    this.buttonGradientColor2 = settings.buttonGradientColor2;
                    document.getElementById('buttonGradientColor2').value = settings.buttonGradientColor2;
                }
                if (settings.bgImage) {
                    this.currentBgImage = settings.bgImage;
                }
                
                if (this.isRealTitle) {
                    const mainTitle = document.getElementById('mainTitle');
                    const titleToggle = document.getElementById('titleToggle');
                    if (mainTitle) mainTitle.textContent = 'MEIN KAMPF';
                    if (titleToggle) titleToggle.textContent = `I don't wanna see this`;
                }
            }
            
            if (entries && Array.isArray(entries)) {
                this.entries = entries.sort((a, b) => b.id - a.id);
            } else {
                this.entries = [];
            }
            this.bindEvents();
            this.applySettings();
            this.updateAllStyles();
            this.renderEntries();
            this.createPhotoModal();
            
            console.log('DiaryApp initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize DiaryApp:', error);
            alert('Error: Failed to initialize the application. Please refresh the page.');
        }
    }

    async loadSettings() {
        try {
            const settings = await this.db.loadSettings();
            console.log('Settings loaded:', settings);
            
            if (settings) {
                this.isRealTitle = settings.isRealTitle || false;
                
                if (settings.textColor) {
                    document.getElementById('textColorPicker').value = settings.textColor;
                }
                if (settings.bgColor) {
                    document.getElementById('bgColorPicker').value = settings.bgColor;
                }
                if (settings.buttonGradientColor1) {
                    this.buttonGradientColor1 = settings.buttonGradientColor1;
                    document.getElementById('buttonGradientColor1').value = settings.buttonGradientColor1;
                }
                if (settings.buttonGradientColor2) {
                    this.buttonGradientColor2 = settings.buttonGradientColor2;
                    document.getElementById('buttonGradientColor2').value = settings.buttonGradientColor2;
                }
                if (settings.bgImage) {
                    this.currentBgImage = settings.bgImage;
                }
                
                if (this.isRealTitle) {
                    const mainTitle = document.getElementById('mainTitle');
                    const titleToggle = document.getElementById('titleToggle');
                    if (mainTitle) mainTitle.textContent = 'MEIN KAMPF';
                    if (titleToggle) titleToggle.textContent = `I don't wanna see this`;
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadEntries() {
        try {
            const entries = await this.db.loadAllEntries();
            console.log('Entries loaded:', entries);
            
            if (entries && Array.isArray(entries)) {
                this.entries = entries.sort((a, b) => b.id - a.id);
            } else {
                this.entries = [];
            }
        } catch (error) {
            console.error('Error loading entries:', error);
            this.entries = [];
        }
    }

    async saveSettings() {
        try {
            const settings = {
                isRealTitle: this.isRealTitle,
                textColor: document.getElementById('textColorPicker').value,
                bgColor: document.getElementById('bgColorPicker').value,
                bgImage: this.currentBgImage,
                buttonGradientColor1: this.buttonGradientColor1,
                buttonGradientColor2: this.buttonGradientColor2
            };
            
            await this.db.saveSettings(settings);
            console.log('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async addEntry() {
        const textarea = document.getElementById('entryTextArea');
        const text = textarea.value.trim();
        
        if (text === '') {
            alert('Please enter some text for your diary entry');
            return;
        }

        const entry = {
            id: Date.now(), 
            date: this.getFormattedDate(),
            text: text,
            photos: []
        };

        try {
            await this.db.saveEntry(entry);
            
            if (this.currentPhotos.length > 0) {
                for (let i = 0; i < this.currentPhotos.length; i++) {
                    const photoData = {
                        id: `${entry.id}_photo_${i}_${Date.now()}`, 
                        entryId: entry.id,
                        dataUrl: this.currentPhotos[i],
                        index: i
                    };
                    await this.db.savePhoto(photoData);
                }
                entry.photos = [...this.currentPhotos];
            }

            this.entries.unshift(entry);
            textarea.value = '';
            this.clearCurrentPhotos();
            this.renderEntries();
            
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error saving entry. Please try again.');
        }
    }

    bindEvents() {
        const titleToggle = document.getElementById('titleToggle');
        const bonusButton = document.getElementById('bonusButton');
        const textColorPicker = document.getElementById('textColorPicker');
        const bgColorPicker = document.getElementById('bgColorPicker');
        const gradientColor1 = document.getElementById('buttonGradientColor1');
        const gradientColor2 = document.getElementById('buttonGradientColor2');
        const imageUploadBtn = document.getElementById('imageUploadBtn');
        const imageRemoveBtn = document.getElementById('imageRemoveBtn');
        const bgImageInput = document.getElementById('bgImageInput');
        const entryTextArea = document.getElementById('entryTextArea');
        const addEntryBtn = document.getElementById('addEntryBtn');
        const addPhotoBtn = document.getElementById('addPhotoBtn');
        const photoInput = document.getElementById('photoInput');

        titleToggle.addEventListener('click', () => this.toggleTitle());
        bonusButton.addEventListener('click', () => this.openBonusFeature());
        textColorPicker.addEventListener('input', (e) => this.changeTextColor(e.target.value));
        bgColorPicker.addEventListener('input', (e) => this.changeBackgroundColor(e.target.value));
        gradientColor1.addEventListener('input', (e) => {
            this.buttonGradientColor1 = e.target.value;
            this.updateButtonGradient();
        });
        gradientColor2.addEventListener('input', (e) => {
            this.buttonGradientColor2 = e.target.value;
            this.updateButtonGradient();
        });
        imageUploadBtn.addEventListener('click', () => bgImageInput.click());
        bgImageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        imageRemoveBtn.addEventListener('click', () => this.removeBackgroundImage());
        addEntryBtn.addEventListener('click', () => this.addEntry());
        entryTextArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addEntry();
            }
        });
        addPhotoBtn.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', (e) => this.handlePhotoUpload(e));
    }

    toggleTitle() {
        const mainTitle = document.getElementById('mainTitle');
        const titleToggle = document.getElementById('titleToggle');
        
        if (this.isRealTitle) {
            mainTitle.textContent = 'MY DIARY';
            titleToggle.textContent = 'Wanna see the real title?';
            this.isRealTitle = false;
        } else {
            mainTitle.textContent = 'MEIN KAMPF';
            titleToggle.textContent = `I don't wanna see this`;
            this.isRealTitle = true;
        }
        this.saveSettings();
    }

    openBonusFeature() {
        window.open('https://www.youtube.com/watch?v=xvFZjo5PgG0&list=RDxvFZjo5PgG0&start_radio=1', '_blank');
    }

    changeTextColor(color) {
        document.documentElement.style.setProperty('--textColor', color);
        this.updateAllStyles();
        this.saveSettings();
    }

    changeBackgroundColor(color) {
        document.body.style.backgroundColor = color;
        document.documentElement.style.setProperty('--bgColor', color);
        this.saveSettings();
    }

    updateButtonGradient() {
        document.documentElement.style.setProperty('--buttonGradientColor1', this.buttonGradientColor1);
        document.documentElement.style.setProperty('--buttonGradientColor2', this.buttonGradientColor2);
        this.saveSettings();
    }

    updateTextStyles() {
        const textColor = document.getElementById('textColorPicker').value;
        const textElements = [document.body, ...document.querySelectorAll('.color-control label')];
        textElements.forEach(element => {
            if (element) element.style.color = textColor;
        });
    }

    updateAllStyles() {
        this.updateTextStyles();
        this.updateButtonGradient();
    }

    getPhotoLayoutClass(photoCount) {
        switch (photoCount) {
            case 1: return 'single';
            case 2: return 'double';
            case 3: return 'triple';
            case 4: return 'quadruple';
            case 5: return 'quintuple';
            default: return '';
        }
    }

    getFormattedDate() {
        const now = new Date();
        const day = now.getDate();
        const month = now.toLocaleString('en', { month: "short" });
        const year = now.getFullYear();
        return `${day} ${month}, ${year}`;
    }

    async renderEntries() {
        const entriesList = document.getElementById('entriesList');
        for (const entry of this.entries) {
            if (!entry.photos || entry.photos.length === 0) {
                const photos = await this.db.getPhotosByEntry(entry.id);
                if (photos && Array.isArray(photos)) {
                    entry.photos = photos
                        .sort((a, b) => a.index - b.index)
                        .map(photo => photo.dataUrl);
                }
            }
        }

        entriesList.innerHTML = this.entries.map(entry => `
            <div class="entry" data-id="${entry.id}">
                <div class="entry-content">
                    <div class="entry-date">${entry.date}</div>
                    <div class="entry-text">${this.escapeHtml(entry.text)}</div>
                    ${entry.photos && entry.photos.length > 0 ? `
                        <div class="entry-photos ${this.getPhotoLayoutClass(entry.photos.length)}">
                            ${entry.photos.map((photo, photoIndex) => `
                                <img src="${photo}" class="entry-photo" data-entry-id="${entry.id}" data-photo-index="${photoIndex}">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        this.addPhotoClickHandlers();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addPhotoClickHandlers() {
        const photos = document.querySelectorAll('.entry-photo');
        photos.forEach(photo => {
            photo.addEventListener('click', (e) => {
                const entryId = e.target.getAttribute('data-entry-id');
                const photoIndex = parseInt(e.target.getAttribute('data-photo-index'));
                this.openPhotoModal(entryId, photoIndex);
            });
        });
    }

    createPhotoModal() {
        const modalHTML = `
            <div id="photoModal" class="photo-modal">
                <div class="modal-content">
                    <span class="close-modal">&times;</span>
                    <img id="modalImage" src="">
                    <div class="modal-nav">
                        <button id="prevBtn" class="nav-button">‹</button>
                        <span id="photoCounter" class="photo-counter">1/1</span>
                        <button id="nextBtn" class="nav-button">›</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('photoModal');
        const closeBtn = document.querySelector('.close-modal');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        closeBtn.addEventListener('click', () => this.closePhotoModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closePhotoModal();
        });
        prevBtn.addEventListener('click', () => this.navigatePhotos(-1));
        nextBtn.addEventListener('click', () => this.navigatePhotos(1));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'block') {
                this.closePhotoModal();
            }
        });
    }

    openPhotoModal(entryId, photoIndex) {
        const entry = this.entries.find(e => e.id == entryId);
        if (!entry || !entry.photos) return;
        
        this.currentModalEntryId = entryId;
        this.currentModalPhotoIndex = photoIndex;
        
        const modal = document.getElementById('photoModal');
        const modalImage = document.getElementById('modalImage');
        const photoCounter = document.getElementById('photoCounter');
        
        modalImage.src = entry.photos[photoIndex];
        photoCounter.textContent = `${photoIndex + 1}/${entry.photos.length}`;
        document.body.style.overflow = 'hidden';
        document.body.style.width = '100%';
        
        modal.style.display = 'block';
    }

    closePhotoModal() {
        const modal = document.getElementById('photoModal');
        modal.style.display = 'none';
        
        // Восстанавливаем скролл body
        document.body.style.overflow = 'auto';
        document.body.style.width = 'auto';
    }

    navigatePhotos(direction) {
        const entry = this.entries.find(e => e.id == this.currentModalEntryId);
        if (!entry || !entry.photos) return;
        
        let newIndex = this.currentModalPhotoIndex + direction;
        if (newIndex < 0) newIndex = entry.photos.length - 1;
        if (newIndex >= entry.photos.length) newIndex = 0;
        
        this.currentModalPhotoIndex = newIndex;
        
        const modalImage = document.getElementById('modalImage');
        const photoCounter = document.getElementById('photoCounter');
        
        modalImage.src = entry.photos[newIndex];
        photoCounter.textContent = `${newIndex + 1}/${entry.photos.length}`;
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            try {
                const imageDataUrl = await this.readFileAsDataURL(file);
                this.currentBgImage = imageDataUrl;
                this.applyBackgroundImage();
                await this.saveSettings();
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Error uploading image. Please try again :(');
            }
        } else {
            alert('Please select a valid image file');
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    applyBackgroundImage() {
        if (this.currentBgImage) {
            document.body.style.backgroundImage = `url(${this.currentBgImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.getElementById('imageRemoveBtn').style.display = 'inline-block';
        }
    }

    removeBackgroundImage() {
        this.currentBgImage = null;
        document.body.style.backgroundImage = '';
        document.getElementById('imageRemoveBtn').style.display = 'none';
        
        const bgColor = document.getElementById('bgColorPicker').value;
        this.changeBackgroundColor(bgColor);
        this.saveSettings();
    }

    async handlePhotoUpload(event) {
        const files = Array.from(event.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            alert('Please, select valid image files');
            return;
        }
        
        const remainingSlots = 5 - this.currentPhotos.length;
        if (remainingSlots <= 0) {
            alert('Maximum 5 photos allowed');
            return;
        }
        
        const filesToAdd = imageFiles.slice(0, remainingSlots);
        
        try {
            for (const file of filesToAdd) {
                const imageDataUrl = await this.readFileAsDataURL(file);
                this.currentPhotos.push(imageDataUrl);
            }
            
            this.updatePhotoButton();
            
            if (filesToAdd.length < imageFiles.length) {
                alert(`Added ${filesToAdd.length} photos. Maximum 5 photos allowed.`);
            }
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Error uploading photos. Please try again.');
        }
        
        event.target.value = '';
    }

    updatePhotoButton() {
        const addPhotoBtn = document.getElementById('addPhotoBtn');
        const photoCount = this.currentPhotos.length;
        
        if (photoCount >= 1) {
            addPhotoBtn.textContent = photoCount;
            addPhotoBtn.classList.add('has-photos');
        } else {
            addPhotoBtn.textContent = '+';
            addPhotoBtn.classList.remove('has-photos');
        }
    }

    clearCurrentPhotos() {
        this.currentPhotos = [];
        this.updatePhotoButton();
    }

    applySettings() {
        const textColor = document.getElementById('textColorPicker').value;
        const bgColor = document.getElementById('bgColorPicker').value;
        
        this.changeTextColor(textColor);
        this.changeBackgroundColor(bgColor);
        
        if (this.currentBgImage) {
            this.applyBackgroundImage();
        }
        
        this.updateAllStyles();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DiaryApp();
});