class diaryDB{
    constructor(){
        this.dbName = 'DiaryAppDB'
        this.version = 1
        this.db = null
    }
    async init(){
        return new Promise((resolve,reject)=>{
            const request = indexedDB.open(this.dbName,this.version)
            request.onerror = () => reject(request.error)
            request.onsuccess = () =>{
                this.db = request.result
                resolve(this.db)
            }
            request.onupgradeneeded = (event) =>{
                const db = event.target.result
                if(!db.objectStoreNames.contains('settings')){
                    db.createObjectStore('settings',{keypath:'id'})
                }
                if(!db.objectStoreNames.contains('entries')){
                    const entriesStore = db.createObjectStore('entries',{keypath:'id'})
                    entriesStore.createIndex('date','date',{unique:false})
                }
                if(!db.objectStoreNames.contains('photos')){
                    const photosStore = db.createObjectStore('photos',{keypath:'id'})
                    photosStore.createIndex('entryId','entryId',{unique:false})
                }
            }
        })
    }
    async saveSettings(settings){
        return this.executeTransaction('settings','readwrite',(store)=>{
            store.put({id:'diarySettings',...settings})
        })
    }
    async loadSettings(){
        return this.executeTransaction('settings','readonly',(store)=>{
            return store.get('diarySettings')
        })
    }
    async saveEntry(entry){
        return this.executeTransaction('entries','readwrite',(store)=>{
            store.put(entry)
        })
    }
    async loadAllEntries(){
        return this.executeTransaction('entries','readonly',(store)=>{
            return store.getAll()
        })
    }
    async savePhoto(photoData){
        return this.executeTransaction('photos','readwrite',(store)=>{
            store.put(photoData)
        })
    }
    async getPhotosByEntry(entryId){
        return this.executeTransaction('photos','readonly',(store)=>{
            const index = store.index('entryId')
            return index.getAll(entryId)
        })
    }
    executeTransaction(storeName,mode,operation){
        return new Promise((resolve,reject)=>{
            const transaction = this.db.transaction([storeName],mode)
            const store = transaction.objectStore(storeName)
            transaction.oncomplete = () => resolve()
            transaction.onerror = () => reject(transaction.error)
            const request = operation(store)
            if(request){
                request.onsucsess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            }
        })
    }
    async clearAll() {
        await this.executeTransaction('settings', 'readwrite', (store) => store.clear())
        await this.executeTransaction('entries', 'readwrite', (store) => store.clear())
        await this.executeTransaction('photos', 'readwrite', (store) => store.clear())
    }
}
class DiaryApp{
    constructor(){
        this.isRealTitle = false
        this.currentBgImage = null
        this.buttonGradientColor1 = '#FF6B6B'
        this.buttonGradientColor2 = '#4ECDC4'
        this.entries = []
        this.currentPhotos = []
        this.currentModalEntryId = null
        this.currentModalPhotoIndex = 0
        this.boundPhotoClickHandler = null
        this.db = new diaryDB()
        this.init()
    }
    async init(){
        try{
            await this.db.init()
            await this.loadSettings()
            await this.loadEntries()
            this.bindEvents()
            this.applySettings()
            this.updateAllStyles()
            this.renderEntries()
            this.createPhotoModal()
        }
        catch(error){
            console.error(error)
        }
    }
    bindEvents(){
        const titleToggle = document.getElementById('titleToggle')
        titleToggle.addEventListener('click',()=>this.toggleTitle())
        const bonusButton = document.getElementById('bonusButton')
        bonusButton.addEventListener('click',()=> this.openBonusFeature())
        const textColorPicker = document.getElementById('textColorPicker')
        textColorPicker.addEventListener('change',(e)=>this.changeTextColor(e.target.value))
        textColorPicker.addEventListener('input',(e)=>this.changeTextColor(e.target.value))
        const bgColorPicker = document.getElementById('bgColorPicker')
        bgColorPicker.addEventListener('change',(e)=>this.changeBackgroundColor(e.target.value))
        bgColorPicker.addEventListener('input',(e)=>this.changeBackgroundColor(e.target.value))
        const imageUploadBtn = document.getElementById('imageUploadBtn')
        const imageRemoveBtn = document.getElementById('imageRemoveBtn')
        const bgImageInput = document.getElementById('bgImageInput')
        imageUploadBtn.addEventListener('click',()=>bgImageInput.click())
        bgImageInput.addEventListener('change',(e)=> this.handleImageUpload(e))
        imageRemoveBtn.addEventListener('click',()=> this.removeBackgroundImage())
        const gradientColor1 = document.getElementById('buttonGradientColor1')
        const gradientColor2 = document.getElementById('buttonGradientColor2')
        gradientColor1.addEventListener('input',(e)=>{
            this.buttonGradientColor1 = e.target.value
            this.updateButtonGradient()
        })
        gradientColor2.addEventListener('input',(e)=>{
            this.buttonGradientColor2 = e.target.value
            this.updateButtonGradient()
        })
        const entryTextArea  = document.getElementById('entryTextArea')
        const addEntryBtn = document.getElementById('addEntryBtn')
        addEntryBtn.addEventListener('click',()=>this.addEntry())
        entryTextArea.addEventListener('keydown',(e)=>{
            if(e.key === 'Enter' && !e.shiftKey){
                e.preventDefault()
                this.addEntry()
            }
        })
        const addPhotoBtn = document.getElementById('addPhotoBtn')
        const photoInput = document.getElementById('photoInput')
        addPhotoBtn.addEventListener('click',()=>photoInput.click())
        photoInput.addEventListener('change',(e)=>this.handlePhotoUpload(e))
    }
    toggleTitle(){
        const mainTitle =  document.getElementById('mainTitle')
        const titleToggle = document.getElementById('titleToggle')
        if(this.isRealTitle){
            mainTitle.textContent = 'MY DIARY'
            titleToggle.textContent = 'Wanna see the real title?'
            this.isRealTitle = false
        }
        else{
            mainTitle.textContent = 'MEIN KAMPF'
            titleToggle.textContent = `I don't wanna see this`
            this.isRealTitle = true
        }
        this.updateAllStyles()
        this.saveSettings()
    }
    openBonusFeature(){
        window.open('https://www.youtube.com/watch?v=xvFZjo5PgG0&list=RDxvFZjo5PgG0&start_radio=1','_blank')
    }
    changeTextColor(color){
        document.documentElement.style.setProperty('--textColor',color)
        this.updateAllStyles()
        this.saveSettings()
    }
    changeBackgroundColor(color){
        document.body.style.backgroundColor = color
        document.documentElement.style.setProperty('--bgColor',color)
        this.saveSettings()
    }
    updateButtonGradient(){
        document.documentElement.style.setProperty('--buttonGradientColor1',this.buttonGradientColor1)
        document.documentElement.style.setProperty('--buttonGradientColor2',this.buttonGradientColor2)
        this.saveSettings()
    }
    updateTextStyles(){
        const textColor = document.getElementById('textColorPicker').value
        const textElements = [document.body,...document.querySelectorAll('.color-control label')]
        textElements.forEach(element=>{
            if(element) element.style.color = textColor
        })
    }
    updateAllStyles(){
       this.updateTextStyles()
       this.updateButtonGradient()
    }
    async addEntry(){
        const textarea = document.getElementById('entryTextArea')
        const text = textarea.value.trim()
        if(text==='') return
        const entry = {
            id: Date.now(),
            date: this.getFormattedDate(),
            text: text,
            photos: []
        }
        if(this.currentPhotos.length > 0){
            for(let i =0; i<this.currentPhotos.length; i++){
                const photoData = {
                    id: `${entry.id}_photo_${i}`,
                    entryId: entry.id,
                    dataUrl: this.currentPhotos[i],
                    index: i
                }
                await this.db.savePhoto(photoData)
            }
            entry.photos = this.currentPhotos
        }
        this.entries.unshift(entry)
        textarea.value = ''
        this.clearCurrentPhotos()
        await this.db.saveEntry()
        this.renderEntries()
    }
    getPhotoLayoutClass(photoCount){
        switch(photoCount){
            case 1: return 'single';
            case 2: return 'double';
            case 3: return 'triple';
            case 4: return 'quadruple';
            case 5: return 'quintuple';
            default: return ''
        }
    }
    getFormattedDate(){
        const now = new Date()
        const day = now.getDate()
        const month = now.toLocaleString('en',{month:"short"})
        const year = now.getFullYear()
        return `${day} ${month}, ${year}`
    }
    renderEntries(){
        const entriesList = document.getElementById('entriesList')
        for(const entry of this.entries){
            if(!entry.photos || entry.photos.length===0){
                const photos = await.this.db.getPhotosByEntry(entry.id)
                entry.photos = photos.sort((a,b)=>a.index - b.index).map(photo=>photo.dataUrl)
            }
        }
        entriesList.innerHTML = this.entries.map(entry => `
            <div class="entry" data-id="${entry.id}">
                <div class="entry-content">
                    <div class="entry-date">${entry.date}</div>
                    <div class="entry-text">${this.escapeHtml(entry.text)}</div>
                    ${entry.photos && entry.photos.length > 0 ? `
                        <div class="entry-photos ${this.getPhotoLayoutClass(entry.photos.length)}">
                            ${entry.photos.map((photo,photoIndex) => `
                                <img src="${photo}" class="entry-photo" data-entry-id="${entry.id}" data-photo-index="${photoIndex}">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('')
        this.addPhotoClickHandlers()
    }
    escapeHtml(text){
        const div = document.createElement('div')
        div.textContent = text
        return div.innerHTML
    }
    async loadEntries(){
                try{
                    const entries = await this.db.loadAllEntries()
                    this.entries = entries.sort((a,b)=>b.id-a.id)
                }
                catch(error){
                    console.error(error)
                    this.entries = []
                }
            }
    addPhotoClickHandlers(){
    const entriesList = document.getElementById('entriesList')
    entriesList.removeEventListener('click', this.boundPhotoClickHandler)
    this.boundPhotoClickHandler = this.handlePhotoClick.bind(this)
    entriesList.addEventListener('click', this.boundPhotoClickHandler)
    }
    handlePhotoClick(event){
        const photoElement = event.target.closest('.entry-photo')
        if(photoElement){
        const entryId = photoElement.getAttribute('data-entry-id')
        const photoIndex = parseInt(photoElement.getAttribute('data-photo-index'))
        if (entryId && !isNaN(photoIndex)) {
            this.openPhotoModal(entryId, photoIndex)
        }
    } 
    }
    
    createPhotoModal(){
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
        `
        document.body.insertAdjacentHTML('beforeend',modalHTML)
        const modal = document.getElementById('photoModal')
        const closeBtn = document.querySelector('.close-modal')
        const prevBtn = document.getElementById('prevBtn')
        const nextBtn = document.getElementById('nextBtn')
        closeBtn.addEventListener('click',()=>this.closePhotoModal())
        modal.addEventListener('click',(e)=>{
            if(e.target===modal) this.closePhotoModal()
        })
        prevBtn.addEventListener('click',()=>this.navigatePhotos(-1))
        nextBtn.addEventListener('click',()=>this.navigatePhotos(1))
        document.addEventListener('keydown',(e)=>{
            if(e.key=== 'Escape' && modal.style.display === 'block') this.closePhotoModal()
        })
    }
    openPhotoModal(entryId, photoIndex){
        const numericEntryId = parseInt(entryId)
        const entry = this.entries.find(e=> e.id === numericEntryId)
       
    if (!entry) {
        console.error('Entry not found for ID:', numericEntryId)
        return
    }
    
    if (!entry.photos || entry.photos.length === 0) {
        console.error('No photos in entry')
        return
    }
    
    if (photoIndex < 0 || photoIndex >= entry.photos.length) {
        console.error('Invalid photo index:', photoIndex, 'Max:', entry.photos.length - 1)
        return
    }
    
    this.currentModalEntryId = numericEntryId
    this.currentModalPhotoIndex = photoIndex
    
    const modal = document.getElementById('photoModal')
    const modalImage = document.getElementById('modalImage')
    const photoCounter = document.getElementById('photoCounter')
    
    if (!modal || !modalImage) {
        console.error('Modal elements not found')
        return
    }
    modalImage.src = entry.photos[photoIndex]
    photoCounter.textContent = `${photoIndex + 1}/${entry.photos.length}`
    modal.style.display = 'block'
    document.body.style.overflow = 'hidden'
    document.body.style.width = '100%'
    }
    closePhotoModal(){
        const modal = document.getElementById('photoModal')
        modal.style.display = 'none'
        document.body.style.overflow = 'auto'
        document.body.style.width = 'auto'
    }
    navigatePhotos(direction){
        const entry = this.entries.find(e=> e.id == this.currentModalEntryId)
        if(!entry || !entry.photos) return
        let newIndex  = this.currentModalPhotoIndex + direction
        if(newIndex<0) newIndex = entry.photos.length - 1
        if(newIndex>=entry.photos.length) newIndex = 0
        this.currentModalPhotoIndex = newIndex
        const modalImage = document.getElementById('modalImage')
        const photoCounter = document.getElementById('photoCounter')
        modalImage.src = entry.photos[newIndex]
        photoCounter.textContent = `${newIndex+1}/${entry.photos.length}`
    }
    async handleImageUpload(event){
        const file = event.target.files[0]
        if(file && file.type.startsWith('image/')){
            try{
                const imageDataUrl = await this.readFileDataAsUrl(file)
                this.currentBgImage = imageDataUrl
                this.applyBackgroundImage()
                await this.saveSettings()
            }
            catch(error){
                console.error(error)
                alert('Error uploading image. Pls try again :(')
            }
        }
        else alert('Pls, select a valid image file')
    }
    readFileDataAsUrl(file){
        return new Promise((resolve,reject)=>{
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target.result)
            reader.onerror = (e) => reject(e)
            reader.readAsDataURL(file)
        })
    }

    applyBackgroundImage(){
        if(this.currentBgImage){
            document.body.style.backgroundImage = `url(${this.currentBgImage})`
            document.body.style.backgroundSize = 'cover'
            document.body.style.backgroundPosition = 'center'
            document.body.style.backgroundAttachment = 'fixed'
            document.body.style.backgroundRepeat = 'no-repeat'
            document.getElementById('imageRemoveBtn').style.display = 'inline-block'
        }
    }
    removeBackgroundImage(){
        this.currentBgImage = null
        document.body.style.backgroundImage = ''
        document.getElementById('imageRemoveBtn').style.display = 'none'
        const bgColor = document.getElementById('bgColorPicker').value
        this.changeBackgroundColor(bgColor)
        this.saveSettings()
    }
    async handlePhotoUpload(event){
        const files = Array.from(event.target.files)
        const imageFiles = files.filter(file=>file.type.startsWith('image/'))
        if(imageFiles.length===0) {
            alert('Please, select valid image files')
            return
        }
        const remainingSlots = 5 - this.currentPhotos.length
        if(remainingSlots<=0) {
            alert('Maximum 5 photos allowed')
            return 
        }
        const filesToAdd = imageFiles.slice(0, remainingSlots)
        try{
            for(const file of filesToAdd){
                const imageDataUrl = await this.readFileDataAsUrl(file)
                this.currentPhotos.push(imageDataUrl)
            }
            this.updatePhotoButton()
            if(filesToAdd.length <imageFiles.length) alert(`Added ${filesToAdd.length} files. Maximum 5`)
        }
        catch(error){
            console.error(error)
            alert('Error, motherfucka')
        }
        event.target.value = ''
    }
    updatePhotoButton(){
        const addPhotoBtn = document.getElementById('addPhotoBtn')
        const photoCount = this.currentPhotos.length
        if(photoCount>=1){
            addPhotoBtn.textContent = photoCount
            addPhotoBtn.classList.add('has-photos')
        }
        else{
            addPhotoBtn.textContent = '+'
            addPhotoBtn.classList.remove('has-photos')
        }
    }
    clearCurrentPhotos(){
        this.currentPhotos = []
        this.updatePhotoButton()
    }
    async saveSettings(){
             const settings = {
                isRealTitle : this.isRealTitle,
                textColor: document.getElementById('textColorPicker').value,
                bgColor: document.getElementById('bgColorPicker').value,
                bgImage: this.currentBgImage,
                buttonGradientColor1: this.buttonGradientColor1,
                buttonGradientColor2: this.buttonGradientColor2
            }
        await this.db.saveSettings(settings)
    }
    async loadSettings(){
                try{
                    const settings = await this.db.loadSettings()
                    this.isRealTitle = settings.isRealTitle || false
                    if(settings.textColor) document.getElementById('textColorPicker').value = settings.textColor
                    if(settings.bgColor) document.getElementById('bgColorPicker').value = settings.bgColor
                    if(settings.bgImage) this.currentBgImage = settings.bgImage
                    if(settings.buttonGradientColor1){
                        this.buttonGradientColor1 = settings.buttonGradientColor1
                        document.getElementById('buttonGradientColor1').value = settings.buttonGradientColor1
                    }
                    if(settings.buttonGradientColor2){
                        this.buttonGradientColor2 = settings.buttonGradientColor2
                        document.getElementById('buttonGradientColor2').value = settings.buttonGradientColor2
                    }
                    if(this.isRealTitle){
                        const mainTitle = document.getElementById('mainTitle')
                        if(mainTitle) mainTitle.textContent = 'MEIN KAMPF'
                        const titleToggle = document.getElementById('titleToggle')
                        if(titleToggle) titleToggle.textContent = `I don't wanna to see this`
                    }
                }
                catch(error){
                    console.error(error)
                }
    }
    applySettings(){
        const textColor = document.getElementById('textColorPicker').value
        const bgColor = document.getElementById('bgColorPicker').value
        this.changeTextColor(textColor)
        this.changeBackgroundColor(bgColor)
        if(this.currentBgImage) this.applyBackgroundImage()
        this.updateAllStyles()
    }
}
document.addEventListener('DOMContentLoaded',()=>{
    new DiaryApp()
})