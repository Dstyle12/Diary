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
        this.init()
    }
    async init(){
        await this.loadSettings()
        await this.loadEntries()
        this.bindEvents()
        this.applySettings()
        this.updateAllStyles()
        this.renderEntries()
        this.createPhotoModal()
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
    addEntry(){
        const textarea = document.getElementById('entryTextArea')
        const text = textarea.value.trim()
        if(text==='') return
        const entry = {
            id: Date.now(),
            date: this.getFormattedDate(),
            text: text,
            photos: [...this.currentPhotos]
        }
        this.entries.unshift(entry)
        textarea.value = ''
        this.clearCurrentPhotos()
        this.saveEntries()
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
    async saveEntries(){
        return new Promise ((resolve)=>{
            try {
                localStorage.setItem('diaryEntries',JSON.stringify(this.entries))
            } catch (error) {
                console.error('Error saving entries:', error)
                const entriesWithoutPhotos = this.entries.map(entry => ({
                    ...entry,
                    photos: []
                }))
                localStorage.setItem('diaryEntries',JSON.stringify(entriesWithoutPhotos))
                alert('Photos were too large to save. Only text has been saved.')
            }
            resolve()
        })
    }
    async loadEntries(){
        return new Promise((resolve)=>{
            const savedEntries = localStorage.getItem('diaryEntries')
            if(savedEntries){
                try{
                    this.entries = JSON.parse(savedEntries)
                }
                catch(error){
                    console.error(error)
                    this.entries = []
                }
            }
            resolve()
        })
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
        console.error('❌ Entry not found for ID:', numericEntryId)
        return
    }
    
    if (!entry.photos || entry.photos.length === 0) {
        console.error('❌ No photos in entry')
        return
    }
    
    if (photoIndex < 0 || photoIndex >= entry.photos.length) {
        console.error('❌ Invalid photo index:', photoIndex, 'Max:', entry.photos.length - 1)
        return
    }
    
    this.currentModalEntryId = numericEntryId
    this.currentModalPhotoIndex = photoIndex
    
    const modal = document.getElementById('photoModal')
    const modalImage = document.getElementById('modalImage')
    const photoCounter = document.getElementById('photoCounter')
    
    if (!modal || !modalImage) {
        console.error('❌ Modal elements not found')
        return
    }
    modalImage.src = entry.photos[photoIndex]
    photoCounter.textContent = `${photoIndex + 1}/${entry.photos.length}`
    modal.style.display = 'block'
    document.body.style.overflow = 'hidden'
    }
    closePhotoModal(){
        const modal = document.getElementById('photoModal')
        modal.style.display = 'none'
        document.body.style.overflow = 'auto'
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
        return new Promise((resolve)=>{
             const settings = {
                isRealTitle : this.isRealTitle,
                textColor: document.getElementById('textColorPicker').value,
                bgColor: document.getElementById('bgColorPicker').value,
                bgImage: this.currentBgImage,
                buttonGradientColor1: this.buttonGradientColor1,
                buttonGradientColor2: this.buttonGradientColor2
            }
        localStorage.setItem('diarySettings',JSON.stringify(settings))
        resolve()
        })
    }
    async loadSettings(){
        return new Promise((resolve)=>{
            const savedSettings = localStorage.getItem('diarySettings')
            if(savedSettings){
                try{
                    const settings = JSON.parse(savedSettings)
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
                    resolve()
                }
                catch(error){
                    console.error(error)
                    resolve()
                }
            }
            else resolve()
        })
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