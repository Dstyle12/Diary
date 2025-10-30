class DiaryDB {
    constructor() {
        this.dbName = 'DiaryAppDB';
        this.version = 4; 
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
                this.createStores(db);
            };
        });
    }

    createStores(db) {
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
        if (!db.objectStoreNames.contains('audios')) {
            const audiosStore = db.createObjectStore('audios', { 
                keyPath: 'id',
                autoIncrement: true
            });
            audiosStore.createIndex('entryId', 'entryId', { unique: false });
        }
    }

    doesStoreExist(storeName) {
        if (!this.db) {
            return false;
        }
        const exists = this.db.objectStoreNames.contains(storeName);
        return exists;
    }

    async saveSettings(settings) {
        if (!this.doesStoreExist('settings')) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['settings'], 'readwrite');
                const store = transaction.objectStore('settings');
                const settingsObj = {
                    id: 'diarySettings',
                    ...settings
                };
                const request = store.put(settingsObj);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async loadSettings() {
        if (!this.doesStoreExist('settings')) {
            return null;
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['settings'], 'readonly');
                const store = transaction.objectStore('settings');
                const request = store.get('diarySettings');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                resolve(null);
            }
        });
    }

    async saveEntry(entry) {
        if (!this.doesStoreExist('entries')) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['entries'], 'readwrite');
                const store = transaction.objectStore('entries');
                const entryWithId = {
                    id: entry.id || Date.now(),
                    ...entry
                };
                const request = store.put(entryWithId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async loadAllEntries() {
        if (!this.doesStoreExist('entries')) {
            return [];
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['entries'], 'readonly');
                const store = transaction.objectStore('entries');
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (error) {
                resolve([]);
            }
        });
    }

    async savePhoto(photoData) {
        if (!this.doesStoreExist('photos')) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['photos'], 'readwrite');
                const store = transaction.objectStore('photos');
                const photoWithId = {
                    id: photoData.id || `${photoData.entryId}_photo_${Date.now()}`,
                    ...photoData
                };
                const request = store.put(photoWithId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getPhotosByEntry(entryId) {
        if (!this.doesStoreExist('photos')) {
            return [];
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['photos'], 'readonly');
                const store = transaction.objectStore('photos');
                const index = store.index('entryId');
                const request = index.getAll(entryId);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (error) {
                resolve([]);
            }
        });
    }

  async saveAudio(audioData) {
        if (!this.doesStoreExist('audios')) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['audios'], 'readwrite');
                const store = transaction.objectStore('audios');
                const audioWithId = {
                    id: audioData.id || `audio_${Date.now()}`,
                    entryId: audioData.entryId,
                    audioBlob: audioData.audioBlob, 
                    duration: audioData.duration,
                    mimeType: audioData.mimeType || 'audio/webm',
                    timestamp: Date.now()
                };
                const request = store.put(audioWithId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getAudioByEntry(entryId) {
        if (!this.doesStoreExist('audios')) {
            return null;
        }
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['audios'], 'readonly');
                const store = transaction.objectStore('audios');
                const index = store.index('entryId');
                const request = index.get(entryId);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result && result.audioBlob) {
                        const audioBlob = new Blob([result.audioBlob], { type: result.mimeType });
                        result.audioUrl = URL.createObjectURL(audioBlob);
                    }
                    resolve(result);
                };
                request.onerror = () => reject(request.error);
            } catch (error) {
                resolve(null);
            }
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
        this.isRecording = false
        this.mediaRecorder = null
        this.audioChunks = []
        this.recordedAudio = null
        this.recordingTime = 0
        this.recordingTimer = null
        this.currentPlayingAudio = null
        this.db = new DiaryDB();
        this.init();
    }

    async init() {
         try {
            await this.db.init();
            const settings = await this.db.loadSettings();
            const entries = await this.db.loadAllEntries();
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
                for (const entry of entries) {
                    if (!entry.audio) {
                        try {
                            const audio = await this.db.getAudioByEntry(entry.id);
                            if (audio) {
                                entry.audio = audio;
                            }
                        } catch (audioError) {
                            entry.audio = null;
                        }
                    }
                }
                this.entries = entries.sort((a, b) => b.id - a.id);
            } else {
                this.entries = [];
            }
            this.bindEvents();
            this.applySettings();
            this.updateAllStyles();
            this.renderEntries();
            this.createPhotoModal();
        } catch (error) {
            alert('Error: Failed to initialize the application. Please refresh the page.');
        }
    }
    
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            const textarea = document.getElementById('entryTextArea');
            if (textarea.value.trim().length > 0) {
                alert('Please clear the text input before starting voice recording');
                return;
            }
            await this.startRecording();
        }
    }

    updateInputStates() {
        const textarea = document.getElementById('entryTextArea');
        const voiceBtn = document.getElementById('voiceRecordBtn');
        const hasText = textarea.value.trim().length > 0;
        const hasAudio = this.recordedAudio !== null;
        if (hasText && (hasAudio || this.isRecording)) {
            voiceBtn.disabled = true;
            voiceBtn.title = 'Clear text to enable voice recording';
        } else if (hasAudio || this.isRecording) {
            textarea.disabled = true;
            textarea.placeholder = 'Voice recording active. Submit to enable text input.';
            voiceBtn.disabled = false;
            voiceBtn.title = this.isRecording ? 'Click to stop recording' : 'Click to record again';
        } else {
            textarea.disabled = false;
            textarea.placeholder = 'Write your diary here...';
            voiceBtn.disabled = hasText;
            voiceBtn.title = hasText ? 'Clear text to enable voice recording' : 'Record voice message';
        }
    }

     async startRecording() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                alert('Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.');
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            if (this.mediaRecorder && this.isRecording) {
                this.stopRecording();
            }
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.recordingTime = 0;
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            this.mediaRecorder.onstop = () => {
                if (this.audioChunks.length > 0) {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    this.recordedAudio = {
                        blob: audioBlob,
                        url: audioUrl,
                        duration: this.recordingTime
                    };
                    this.updateVoiceButtonAfterRecording();
                    this.updateInputStates();
                } else {
                    this.clearRecording();
                }
                stream.getTracks().forEach(track => {
                    track.stop();
                });
            };
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.stopRecording();
            };
            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateVoiceButtonDuringRecording();
            this.startRecordingTimer();
        } catch (error) {
            console.error('Error starting recording:', error);
            if (error.name === 'NotAllowedError') {
                alert('Microphone access denied. Please allow microphone permissions in your browser settings and try again.');
            } else if (error.name === 'NotFoundError') {
                alert('No microphone found. Please check if your microphone is connected and try again.');
            } else if (error.name === 'NotSupportedError') {
                alert('Audio recording is not supported in your browser. Please use Chrome, Firefox, or Edge.');
            } else {
                alert('Error accessing microphone: ' + error.message);
            }
            this.clearRecording();
        }
    }
    stopRecording() {
        this.stopRecordingTimer();
        if (this.mediaRecorder && this.isRecording) {
            try {
                if (this.mediaRecorder.state === 'recording') {
                    this.mediaRecorder.stop();
                    console.log('MediaRecorder stopped');
                } else {
                    console.log('MediaRecorder not in recording state:', this.mediaRecorder.state);
                }
            } catch (error) {
                console.error('Error stopping MediaRecorder:', error);
            }
        }
        
        this.isRecording = false;
    }

    forceClearRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            try {
                this.mediaRecorder.stop();
            } catch (e) {
                console.warn('Error forcing stop:', e);
            }
        }
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordedAudio = null;
        this.recordingTime = 0;
        this.stopRecordingTimer();
        const voiceBtn = document.getElementById('voiceRecordBtn');
        voiceBtn.classList.remove('recording');
        voiceBtn.innerHTML = '<span class="voice-dot"></span>';
        voiceBtn.title = 'Record voice message';
        this.updateInputStates();
    }
    startRecordingTimer() {
        this.stopRecordingTimer(); 
        this.recordingTimer = setInterval(() => {
            if (this.isRecording) {
                this.recordingTime++;
                this.updateRecordingTimerDisplay();
            } else {
                this.stopRecordingTimer();
            }
        }, 1000);
    }

    stopRecordingTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

     updateRecordingTimerDisplay() {
        const voiceBtn = document.getElementById('voiceRecordBtn');
        if (voiceBtn && this.isRecording) {
            const minutes = Math.floor(this.recordingTime / 60);
            const seconds = this.recordingTime % 60;
            const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const timeElement = voiceBtn.querySelector('.voice-time');
            if (timeElement) {
                timeElement.textContent = timeString;
            } else {
                voiceBtn.innerHTML = `<span class="voice-time">${timeString}</span>`;
            }
        }
    }

    updateVoiceButtonDuringRecording() {
        const voiceBtn = document.getElementById('voiceRecordBtn');
        if (voiceBtn) {
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '<span class="voice-time">00:00</span>';
            voiceBtn.title = 'Click to stop recording';
        }
    }

     updateVoiceButtonAfterRecording() {
        const voiceBtn = document.getElementById('voiceRecordBtn');
        if (voiceBtn && this.recordedAudio) {
            voiceBtn.classList.remove('recording');
            const duration = this.recordedAudio.duration;
            if (isNaN(duration) || duration === 0) {
                console.error('Invalid duration:', duration);
                voiceBtn.innerHTML = '<span class="voice-dot"></span>';
            } else {
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                voiceBtn.innerHTML = `<span class="voice-time">${timeString}</span>`;
            }
            voiceBtn.title = 'Click to record again';
        }
    }

      clearRecording() {
        if (this.recordedAudio && this.recordedAudio.url) {
            URL.revokeObjectURL(this.recordedAudio.url);
        }
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordedAudio = null;
        this.recordingTime = 0;
        this.stopRecordingTimer();
        const voiceBtn = document.getElementById('voiceRecordBtn');
        if (voiceBtn) {
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<span class="voice-dot"></span>';
            voiceBtn.title = 'Record voice message';
        }
        this.updateInputStates();
    }

    async loadSettings() {
        try {
            const settings = await this.db.loadSettings();
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
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

      async addEntry() {
        const textarea = document.getElementById('entryTextArea');
        const text = textarea.value.trim();
        if (text === '' && !this.recordedAudio) {
            alert('Please enter some text or record a voice message for your diary entry');
            return;
        }
        if (text !== '' && this.recordedAudio) {
            alert('Please use either text or voice recording, not both');
            return;
        }
        if (this.isRecording) {
            this.stopRecording();
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        const entry = {
            id: Date.now(),
            date: this.getFormattedDate(),
            text: text,
            photos: [...this.currentPhotos],
            audio: null
        };
        try {
            // Сохраняем аудио если есть
            if (this.recordedAudio) {
                const arrayBuffer = await this.blobToArrayBuffer(this.recordedAudio.blob);
                const audioData = {
                    id: `audio_${entry.id}`,
                    entryId: entry.id,
                    audioBlob: arrayBuffer, 
                    duration: this.recordedAudio.duration,
                    mimeType: 'audio/webm'
                };
                await this.db.saveAudio(audioData);
                const audioUrl = URL.createObjectURL(this.recordedAudio.blob);
                entry.audio = {
                    ...audioData,
                    audioUrl: audioUrl
                };
            }
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
            }
            this.entries.unshift(entry);
            textarea.value = '';
            this.clearCurrentPhotos();
            this.clearRecording();
            await this.renderEntries();
        } catch (error) {
            console.error('Error saving entry:', error);
            alert('Error saving entry. Please try again.');
        }
    }

     blobToArrayBuffer(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result;
                const base64 = dataUrl.split(',')[1]; 
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
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
        const voiceRecordBtn = document.getElementById('voiceRecordBtn')
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
        voiceRecordBtn.addEventListener('click',()=>this.toggleRecording())
        entryTextArea.addEventListener('input',()=> this.updateInputStates())
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
        try {
            console.log('Starting renderEntries, total entries:', this.entries.length);
            for (const entry of this.entries) {
                console.log('Processing entry:', entry.id);
                if (!entry.photos || entry.photos.length === 0) {
                    try {
                        const photos = await this.db.getPhotosByEntry(entry.id);
                        if (photos && Array.isArray(photos) && photos.length > 0) {
                            entry.photos = photos
                                .sort((a, b) => a.index - b.index)
                                .map(photo => photo.dataUrl);
                        } else {
                            entry.photos = [];
                        }
                    } catch (photoError) {
                        console.error(`Error loading photos for entry ${entry.id}:`, photoError);
                        entry.photos = [];
                    }
                }
                if (!entry.audio) {
                    try {
                        const audio = await this.db.getAudioByEntry(entry.id);
                        if (audio) {
                            entry.audio = audio;
                        }
                    } catch (audioError) {
                        console.warn(`Could not load audio for entry ${entry.id}:`, audioError);
                        entry.audio = null;
                    }
                }
            }
            entriesList.innerHTML = this.entries.map(entry => {
                try {
                    let audioHTML = '';
                    if (entry.audio) {
                        audioHTML = this.renderAudioPlayer(entry);
                    }
                    let photosHTML = '';
                    if (entry.photos && entry.photos.length > 0) {
                        photosHTML = `
                            <div class="entry-photos ${this.getPhotoLayoutClass(entry.photos.length)}">
                                ${entry.photos.map((photo, photoIndex) => `
                                    <img src="${photo}" class="entry-photo" data-entry-id="${entry.id}" data-photo-index="${photoIndex}">
                                `).join('')}
                            </div>
                        `;
                    }
                    return `
                        <div class="entry" data-id="${entry.id}">
                            <div class="entry-content">
                                <div class="entry-date">${entry.date}</div>
                                <div class="entry-text">${this.escapeHtml(entry.text)}</div>
                                ${audioHTML}
                                ${photosHTML}
                            </div>
                        </div>
                    `;
                } catch (error) {
                    console.error('Error rendering entry:', entry.id, error);
                    return `
                        <div class="entry error">
                            <div class="entry-content">
                                <div class="entry-date">${entry.date}</div>
                                <div class="entry-text">Error displaying this entry</div>
                            </div>
                        </div>
                    `;
                }
            }).join('');
            this.addPhotoClickHandlers();
            this.addAudioPlayHandlers();
        } catch (error) {
            console.error('Error in renderEntries:', error);
            entriesList.innerHTML = '<div class="error">Error loading entries. Please refresh the page.</div>';
        }
    }

    renderAudioPlayer(entry) {
        const minutes = Math.floor(entry.audio.duration / 60);
        const seconds = entry.audio.duration % 60;
        const durationString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        return `
            <div class="voice-entry" data-entry-id="${entry.id}">
                <button class="voice-play-button" data-entry-id="${entry.id}">
                    ▶
                </button>
                <div class="voice-duration">${durationString}</div>
                <div class="voice-timer" style="display: none;">00:00</div>
            </div>
        `;
    }

    addAudioPlayHandlers(){
        const playButtons = document.querySelectorAll('.voice-play-button')
        playButtons.forEach(button=>{
            button.addEventListener('click',(e=>{
                const entryId = e.target.getAttribute('data-entry-id')
                this.toggleAudioPlayback(entryId)
            }))
        })
    }

      toggleAudioPlayback(entryId) {
        const entry = this.entries.find(e => e.id == entryId);
        if (!entry || !entry.audio) {
            console.error('Entry or audio not found for ID:', entryId);
            alert('Audio recording not found');
            return;
        }
        const playButton = document.querySelector(`.voice-play-button[data-entry-id="${entryId}"]`);
        const timerElement = document.querySelector(`.voice-entry[data-entry-id="${entryId}"] .voice-timer`);
        const durationElement = document.querySelector(`.voice-entry[data-entry-id="${entryId}"] .voice-duration`);
        if (!playButton || !timerElement || !durationElement) {
            console.error('Audio player elements not found for entry:', entryId);
            alert('Audio player elements not found');
            return;
        }
        if (this.currentPlayingAudio && this.currentPlayingAudio.entryId == entryId) {
            if (this.currentPlayingAudio.isPlaying) {
                this.currentPlayingAudio.audio.pause();
            } else {
                this.currentPlayingAudio.audio.play().catch(error => {
                    console.error('Error resuming audio:', error);
                    alert('Error resuming audio: ' + error.message);
                });
            }
        } else {
            if (this.currentPlayingAudio) {
                this.stopAudioPlayback();
            }
            this.playAudio(entry, playButton, timerElement, durationElement);
        }
    }

     playAudio(entry, playButton, timerElement, durationElement) {
        try {
            if (this.currentPlayingAudio) {
                this.stopAudioPlayback();
            }
            if (!entry.audio || !entry.audio.audioUrl) {
                console.error('No audio URL found for entry:', entry.id);
                alert('Audio data is missing or corrupted');
                return;
            }
            this.currentPlayingAudio = {
                audio: new Audio(entry.audio.audioUrl),
                entryId: entry.id,
                timer: null,
                isPlaying: false,
                playButton: playButton,
                timerElement: timerElement,
                durationElement: durationElement
            };
            const audio = this.currentPlayingAudio.audio;
            audio.onloadeddata = () => {
                console.log('Audio data loaded, can play');
            };
            audio.oncanplaythrough = () => {
                console.log('Audio can play through');
            };
            audio.onplay = () => {
                if (this.currentPlayingAudio) {
                    this.currentPlayingAudio.isPlaying = true;
                    this.currentPlayingAudio.playButton.innerHTML = '❚❚';
                    this.currentPlayingAudio.durationElement.style.display = 'none';
                    this.currentPlayingAudio.timerElement.style.display = 'block';
                    this.startPlaybackTimer();
                }
            };
            audio.onpause = () => {
                console.log('Audio paused');
                if (this.currentPlayingAudio) {
                    this.currentPlayingAudio.isPlaying = false;
                    this.currentPlayingAudio.playButton.innerHTML = '▶';
                    this.currentPlayingAudio.timerElement.style.display = 'none';
                    this.currentPlayingAudio.durationElement.style.display = 'block';
                }
                this.stopPlaybackTimer();
            };
            audio.onended = () => {
                console.log('Audio ended');
                this.stopAudioPlayback();
                // 🔵 ВОССТАНАВЛИВАЕМ UI через элементы, сохраненные в currentPlayingAudio
                if (this.currentPlayingAudio) {
                    this.currentPlayingAudio.playButton.innerHTML = '▶';
                    this.currentPlayingAudio.timerElement.style.display = 'none';
                    this.currentPlayingAudio.durationElement.style.display = 'block';
                }
            };
            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                console.error('Audio error details:', audio.error);
                let errorMessage = 'Error playing audio recording';
                if (audio.error) {
                    switch(audio.error.code) {
                        case audio.error.MEDIA_ERR_ABORTED:
                            errorMessage = 'Audio playback was aborted';
                            break;
                        case audio.error.MEDIA_ERR_NETWORK:
                            errorMessage = 'Network error occurred while loading audio';
                            break;
                        case audio.error.MEDIA_ERR_DECODE:
                            errorMessage = 'Audio format is not supported';
                            break;
                        case audio.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorMessage = 'Audio format is not supported by your browser';
                            break;
                    }
                }
                alert(errorMessage);
                this.stopAudioPlayback();
            };
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error('Error playing audio:', error);
                    alert('Error playing audio recording: ' + error.message);
                    this.stopAudioPlayback();
                });
            }

        } catch (error) {
            console.error('Error setting up audio playback:', error);
            this.stopAudioPlayback();
        }
    }

   startPlaybackTimer() {
        if (this.currentPlayingAudio && this.currentPlayingAudio.audio) {
            this.stopPlaybackTimer();
            this.currentPlayingAudio.timer = setInterval(() => {
                if (this.currentPlayingAudio && this.currentPlayingAudio.audio) {
                    const currentTime = Math.floor(this.currentPlayingAudio.audio.currentTime);
                    const minutes = Math.floor(currentTime / 60);
                    const seconds = currentTime % 60;
                    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    if (this.currentPlayingAudio.timerElement) {
                        this.currentPlayingAudio.timerElement.textContent = timeString;
                    }
                }
            }, 200);
        }
    }

     stopPlaybackTimer() {
        if (this.currentPlayingAudio && this.currentPlayingAudio.timer) {
            clearInterval(this.currentPlayingAudio.timer);
            this.currentPlayingAudio.timer = null;
        }
    }

   stopAudioPlayback() {
        if (this.currentPlayingAudio) {
            if (this.currentPlayingAudio.audio) {
                this.currentPlayingAudio.audio.pause();
                this.currentPlayingAudio.audio = null;
            }
            this.stopPlaybackTimer();
            if (this.currentPlayingAudio.playButton) {
                this.currentPlayingAudio.playButton.innerHTML = '▶';
            }
            if (this.currentPlayingAudio.timerElement && this.currentPlayingAudio.durationElement) {
                this.currentPlayingAudio.timerElement.style.display = 'none';
                this.currentPlayingAudio.durationElement.style.display = 'block';
            }
            
            this.currentPlayingAudio = null;
        }
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

    cleanupAudioUrls() {
        this.entries.forEach(entry => {
            if (entry.audio && entry.audio.audioUrl) {
                URL.revokeObjectURL(entry.audio.audioUrl);
            }
        });
        if (this.recordedAudio && this.recordedAudio.url) {
            URL.revokeObjectURL(this.recordedAudio.url);
        }
    }
}
window.addEventListener('beforeunload', () => {
    if (window.diaryApp) {
        window.diaryApp.cleanupAudioUrls();
    }
});
document.addEventListener('DOMContentLoaded', () => {
    new DiaryApp();
});