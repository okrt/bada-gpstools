/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function GalleryManager(){

};

GalleryManager.prototype.checkSecurityPolicy = function(feature, deviceCapability) {
    bondi.checkFeature(feature);
    if (!bondi.policy.query(deviceCapability, null, this)) {
        throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
    }
};

GalleryManager.prototype.validateCallbacks = function() {
    for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] !== "function") {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }               
    }
};

GalleryManager.prototype.optionsPrototype = {
        order: 0,
        primarySortOrder: 3, 
        secondarySortOrder: 2,
        filterStartDate: 0,
        filterEndDate: 0,
        filterItemType: 0,
        filterFileName: 'placeholder',
        filterMimeType: 'video/mpeg',
        filterMetaTag: 'placeholder'
};

GalleryManager.prototype.verifyValidOption = function(value, validValues) {
    if (value == undefined) {
        return true;
    }
    for (var i in validValues) {
        if (value === validValues[i]) {
            return true;
        }
    }
    return false;
}

GalleryManager.prototype.verifyOptions = function(viewOptions) {
    if (viewOptions && typeof viewOptions !== 'object') {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }
    for (i in viewOptions) {
        if (bondi.gallery.optionsPrototype[i] == undefined) {
            if (i.indexOf('filterMetaTag') != 0) {
                throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
            }
        }
    }

    // verify options with specific types
    if (viewOptions) {
        var date = viewOptions.filterStartDate || new Date();
        if (!(date instanceof Date)) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        date = viewOptions.filterEndDate || new Date();
        if (!(date instanceof Date)) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        
        var filter = viewOptions.filterFileName || new String();
        if (filter.length == undefined) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        filter = viewOptions.filterMimeType || new String();
        if (filter.length == undefined) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        
        // verify valid entries for each option that has a range of valid types
        var sortOrderOptions = [Gallery.MEDIA_SORT_NONE, Gallery.MEDIA_SORT_BY_FILENAME, Gallery.MEDIA_SORT_BY_FILEDATE, Gallery.MEDIA_SORT_BY_TYPE, Gallery.MEDIA_SORT_BY_TITLE, Gallery.MEDIA_SORT_BY_AUTHOR, Gallery.MEDIA_SORT_BY_ALBUM, Gallery.MEDIA_SORT_BY_DATE];
    
        var ok = this.verifyValidOption(viewOptions.order, [Gallery.MEDIA_SORT_ASCENDING, Gallery.MEDIA_SORT_DESCENDING])
            && this.verifyValidOption(viewOptions.primarySortOrder, sortOrderOptions) 
            && this.verifyValidOption(viewOptions.secondarySortOrder, sortOrderOptions) 
            && this.verifyValidOption(viewOptions.filterItemType, [Gallery.MEDIA_ITEM_TYPE_UNDEFINED, Gallery.MEDIA_ITEM_TYPE_AUDIO, Gallery.MEDIA_ITEM_TYPE_VIDEO, Gallery.MEDIA_ITEM_TYPE_IMAGE]);
        
        if (!ok) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
    }
}

GalleryManager.prototype.handleErrors = function(callback, param) {
    if (callback &&  typeof callback == "function") {
        callback(param);
    }
    else {
        // throw error if null or invalid error callback 
        // this is to match functionality on device acc/to Deepak Mittal [deepak.m1@samsung.com]
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
   }
};

GalleryManager.prototype.getGalleries = function() {
    bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');
    return [new Gallery()];
};

function GalleryError(errorCode) {
    GenericError.call(this, errorCode);
};

GalleryError.prototype = new GenericError();
GalleryError.prototype.constructor = GalleryError;

GalleryError.GALLERY_OPEN_ERROR = 1;
GalleryError.GALLERY_NOT_OPEN_ERROR = 2;
GalleryError.prototype.GALLERY_OPEN_ERROR = GalleryError.GALLERY_OPEN_ERROR;
GalleryError.prototype.GALLERY_NOT_OPEN_ERROR = GalleryError.GALLERY_NOT_OPEN_ERROR;

function Gallery() {
    this.isOpen = false;
    this.isLocked = false;
    this.folders = new Array;
    this.viewOptions = new Object;
    this.currentView = new Array;
    this.nextId = 0;
    // lookup table id -> MediaItem
    this.idMap = new Object;
    // reverse lookup table path -> id
    // allows us to keep constant ids across refresh where we completely build a new item list
    this.reverseIdMap = new Object;
    
    this.AUDIO = 0;
    this.VIDEOS = 1;
    this.IMAGES = 2;
};

Gallery.prototype = {
        get info() {
            return {locationType: 'device', mimetype: ['audio/x-wav', 'audio/mpeg', 'image/gif', 'image/jpeg', 'image/png', 'video/mp4', 'video/mpeg', 'video/quicktime']};
        }    
};

Gallery.MEDIA_SORT_NONE = 0;
Gallery.MEDIA_SORT_BY_FILENAME = 1;
Gallery.MEDIA_SORT_BY_FILEDATE = 2;
Gallery.MEDIA_SORT_BY_TYPE = 3;
Gallery.MEDIA_SORT_BY_TITLE = 20;
Gallery.MEDIA_SORT_BY_AUTHOR = 21;
Gallery.MEDIA_SORT_BY_ALBUM = 22;
Gallery.MEDIA_SORT_BY_DATE = 23;
Gallery.MEDIA_SORT_ASCENDING = 0;
Gallery.MEDIA_SORT_DESCENDING = 1;

Gallery.prototype.MEDIA_SORT_NONE = Gallery.MEDIA_SORT_NONE;
Gallery.prototype.MEDIA_SORT_BY_FILENAME = Gallery.MEDIA_SORT_BY_FILENAME;
Gallery.prototype.MEDIA_SORT_BY_FILEDATE = Gallery.MEDIA_SORT_BY_FILEDATE;
Gallery.prototype.MEDIA_SORT_BY_TYPE = Gallery.MEDIA_SORT_BY_TYPE;
Gallery.prototype.MEDIA_SORT_BY_TITLE = Gallery.MEDIA_SORT_BY_TITLE;
Gallery.prototype.MEDIA_SORT_BY_AUTHOR = Gallery.MEDIA_SORT_BY_AUTHOR;
Gallery.prototype.MEDIA_SORT_BY_ALBUM = Gallery.MEDIA_SORT_BY_ALBUM;
Gallery.prototype.MEDIA_SORT_BY_DATE = Gallery.MEDIA_SORT_BY_DATE;
Gallery.prototype.MEDIA_SORT_ASCENDING = Gallery.MEDIA_SORT_ASCENDING;
Gallery.prototype.MEDIA_SORT_DESCENDING = Gallery.MEDIA_SORT_DESCENDING;

Gallery.MEDIA_ITEM_TYPE_UNDEFINED = 0;
Gallery.MEDIA_ITEM_TYPE_AUDIO = 1;
Gallery.MEDIA_ITEM_TYPE_VIDEO = 2;
Gallery.MEDIA_ITEM_TYPE_IMAGE = 3;

Gallery.prototype.MEDIA_ITEM_TYPE_UNDEFINED = Gallery.MEDIA_ITEM_TYPE_UNDEFINED;
Gallery.prototype.MEDIA_ITEM_TYPE_AUDIO = Gallery.MEDIA_ITEM_TYPE_AUDIO;
Gallery.prototype.MEDIA_ITEM_TYPE_VIDEO = Gallery.MEDIA_ITEM_TYPE_VIDEO;
Gallery.prototype.MEDIA_ITEM_TYPE_IMAGE = Gallery.MEDIA_ITEM_TYPE_IMAGE;

Gallery.prototype.buildMediaItem = function(category, file) {
    // Our id -> mediaItem map gets rebuilt each refresh
    // But our path -> id is persistent across refresh so that we keep ids constant
    var itemId = this.reverseIdMap[file.path];
    if (itemId == undefined) {
        itemId = ++this.nextId;
        this.reverseIdMap[file.path] = itemId;
    }
    var type;
    switch (category) {
        case this.AUDIO:
            type = Gallery.MEDIA_ITEM_TYPE_AUDIO;
            break;
        case this.VIDEOS:
            type = Gallery.MEDIA_ITEM_TYPE_VIDEO;
            break;
        case this.IMAGES:
            type = Gallery.MEDIA_ITEM_TYPE_IMAGE;
            break;
        default:
            type = Gallery.MEDIA_ITEM_TYPE_UNDEFINED;
            break;
    }
    
    // notice: mimeType and metadata are currently not supported in WRT 1.0
    var item = new MediaItem(itemId, type, undefined, file, undefined);
    this.idMap[itemId] = item;
};

Gallery.prototype.matchDate = function(date, expected, testGreater) {
    if (expected == undefined) {
        return true;
    }
    var msExpected = expected.getTime();
    return testGreater ? date >= msExpected : date <= msExpected;
};

Gallery.prototype.matchType = function(type, expected) {
    if (expected == undefined) {
        return true;
    }
    return type == expected;
};

Gallery.prototype.matchName = function(name, expected) {
    if (expected == undefined) {
        return true;
    }
    return name.indexOf(expected) >= 0;
};

Gallery.prototype.getMediaLeafName = function(path) {
    return path.slice(path.lastIndexOf("/")+1);
}

Gallery.prototype.compareItems = function(a, b, sortOrder, secondarySortOrder) {
    // notice that the date filters look at the file's modified date rather than creation date
    // (see use of _file.modified below and in doRefresh)
    // this better matches the windows style for media files, where created is updated
    // when the file is copied
    // Also, sort by name only looks at the leaf name, not the full path.
    var aObj;
    var bObj;
    if (sortOrder == Gallery.MEDIA_SORT_BY_FILENAME || sortOrder == Gallery.MEDIA_SORT_BY_TITLE) {
        aObj = this.getMediaLeafName(a.fileName);
        bObj = this.getMediaLeafName(b.fileName);
    }
    else if (sortOrder == Gallery.MEDIA_SORT_BY_FILEDATE || sortOrder == Gallery.MEDIA_SORT_BY_DATE) {
        aObj = a._file.modified;
        bObj = b._file.modified;
    }
    else if (sortOrder == Gallery.MEDIA_SORT_BY_TYPE) {
        aObj = a.type;
        bObj = b.type;
    }
    if (aObj < bObj) {
        return -1;
    }
    if (aObj > bObj) {
        return 1;
    }
    if (secondarySortOrder) {
         return this.compareItems(a, b, secondarySortOrder, Gallery.MEDIA_SORT_NONE);
    }
    return 0;
};

Gallery.prototype.doRefresh = function() {
    this.idMap = new Object;
    this.currentView = new Array;
    for (var i in this.folders) {
        if (this.folders[i]) {
            var fileList = this.folders[i].listFiles();
            for (var j in fileList) {
                // multiple by 1 is shorthand for a parseInt
                this.buildMediaItem(i*1, fileList[j]);
            }
        }
    }
    
    // iterate through the idMap and create a currentView based on viewOptions
    // first match only those that match our filters, and then sort
    
    for (var i in this.idMap) {
        var mediaItem = this.idMap[i];
        // the filters are filterStartDate, filterEndDate, filterItemType, and filterFileName
        // notice: mimeType and metadata are currently not supported in WRT 1.0
        if (this.matchDate(mediaItem._file.modified, this.viewOptions.filterStartDate, true) 
                && this.matchDate(mediaItem._file.modified, this.viewOptions.filterEndDate, false)
                && this.matchType(mediaItem.type, this.viewOptions.filterItemType)
                && this.matchName(mediaItem.fileName, this.viewOptions.filterFileName)) {
            this.currentView.push(mediaItem);
        }
    }

    // undefined, null or MEDIA_SORT_NONE are treated equally, so we want != here
    if (this.viewOptions.primarySortOrder != Gallery.MEDIA_SORT_NONE)
    {
        var self = this;
        this.currentView.sort(function(a, b) {
            return self.compareItems(a, b, self.viewOptions.primarySortOrder, self.viewOptions.secondarySortOrder);
        });
    }
    
    if (this.viewOptions.order === Gallery.MEDIA_SORT_DESCENDING) {
        this.currentView.reverse();
    }
};

Gallery.prototype.getNumberOfMediaItems = function() {
    bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');
    
    if (!this.isOpen) {
        throw new GalleryError(GalleryError.GALLERY_NOT_OPEN_ERROR);
     }

    return this.currentView.length;
};

Gallery.prototype.open = function(successCallback, errorCallback) {
    try {
 
        bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');
        bondi.gallery.validateCallbacks(successCallback, errorCallback);
    
        var self = this;
        var job = new TimedJob();
        var work = function(job, successCallback, errorCallback) {
            if (self.isOpen) {
                bondi.gallery.handleErrors(errorCallback, new GalleryError(GalleryError.GALLERY_OPEN_ERROR));
            }
            else if (self.isLocked) {
                bondi.gallery.handleErrors(errorCallback, new DeviceAPIError(DeviceAPIError.PENDING_OPERATION_ERROR));
            }
            else {
                self.isLocked = true;
                self.nextId = 0;
                var runtime = document.getElementById('npbondiruntime');
                self.folders[self.AUDIO] = runtime.resolve(bondi.config.filesystem['audio']);
                self.folders[self.VIDEOS] = runtime.resolve(bondi.config.filesystem['videos']);
                self.folders[self.IMAGES] = runtime.resolve(bondi.config.filesystem['images']);
                self.doRefresh();
                self.isOpen = true;
                self.isLocked = false;
                successCallback();
            }
        }
        job.start(work, arguments);
        return job;
        
    }
    catch (err) {
        bondi.gallery.handleErrors(errorCallback, err);
        // must return null if callback was called inline in async function
        return null;
    }
};

Gallery.prototype.refresh = function(successCallback, errorCallback) {
    try {
        
        bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');
        bondi.gallery.validateCallbacks(successCallback, errorCallback);
    
        var self = this;
        var job = new TimedJob();
        var work = function(job, successCallback, errorCallback) {
            if (!self.isOpen) {
                bondi.gallery.handleErrors(errorCallback, new GalleryError(GalleryError.GALLERY_NOT_OPEN_ERROR));
            }
            else if (self.isLocked) {
                bondi.gallery.handleErrors(errorCallback, new DeviceAPIError(DeviceAPIError.PENDING_OPERATION_ERROR));
            }
            else {
                self.isLocked = true;
                self.doRefresh();
                self.isLocked = false;
                successCallback();
            }
        }
        job.start(work, arguments);
        return job;
        
    }
    catch(err) {
        bondi.gallery.handleErrors(errorCallback, err);
        // must return null if callback was called inline in async function
        return null;
    }
};

Gallery.prototype.close = function() {
    bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');
    
    if (!this.isOpen) {
       throw new GalleryError(GalleryError.GALLERY_NOT_OPEN_ERROR);
    }
    if (this.isLocked) {
        throw new DeviceAPIError(DeviceAPIError.PENDING_OPERATION_ERROR);
    }
    
    // clear out all the open state
    for (var i in this.files) {
        this.files[i] = [];
    }
    this.currentView = [];
    this.idMap = new Object;
    this.reverseIdMap = new Object;
    
    this.isOpen = false;
};

Gallery.prototype.changeView = function(successCallback, errorCallback, viewOptions) {
    try {
        
        bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');
        bondi.gallery.validateCallbacks(successCallback, errorCallback);
        bondi.gallery.verifyOptions(viewOptions);
        
        var self = this;
        var job = new TimedJob();
        var work = function(job, successCallback, errorCallback) {
            if (!self.isOpen) {
                bondi.gallery.handleErrors(errorCallback, new GalleryError(GalleryError.GALLERY_NOT_OPEN_ERROR));
            }
            else if (self.isLocked) {
                bondi.gallery.handleErrors(errorCallback, new DeviceAPIError(DeviceAPIError.PENDING_OPERATION_ERROR));
            }
            else {
                self.isLocked = true;
                self.viewOptions = viewOptions;
                self.doRefresh();                
                self.isLocked = false;
                successCallback();
            }
        }
        job.start(work, arguments);
        return job;
       
    }
    catch(err) {
        bondi.gallery.handleErrors(errorCallback, err);
        // must return null if callback was called inline in async function
        return null;
    }
    
};

Gallery.prototype.getMediaItems = function() {
    bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');
    
    if (!this.isOpen) {
       throw new GalleryError(GalleryError.GALLERY_NOT_OPEN_ERROR);
    }
    if (this.isLocked) {
        throw new DeviceAPIError(DeviceAPIError.PENDING_OPERATION_ERROR);
    }

    // return a copy of the current view
    return this.currentView.slice(0);
};

Gallery.prototype.getMediaItemById = function(itemId) {
    bondi.gallery.checkSecurityPolicy('gallery.read', 'io.file.read');

    if (!this.isOpen) {
        throw new GalleryError(GalleryError.GALLERY_NOT_OPEN_ERROR);
    }
    if (this.isLocked) {
        throw new DeviceAPIError(DeviceAPIError.PENDING_OPERATION_ERROR);
    }
    if (typeof itemId !== 'number') {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);        
    }
    
    var item = this.idMap[itemId];
    if (item == undefined) {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }
    
    return item;
};

function MediaItem(id, type, mimeType, file, metadata) {
    this._id = id;
    this._type = type;
    this._mimeType = mimeType;
    this._file = file;
    this._metadata = metadata;
}

MediaItem.prototype = {
        get id() {
            return this._id;
        },
        get type() {
            return this._type;
        },
// NOTE:  Commented out because not implemented in WRT 1.0
//        get mimeType() {
//            return this._mimeType;
//        },
        get fileName() {
            return this._file.path;
        }
// NOTE:  Commented out because not implemented in WRT 1.0
//        get metadata() {
//            return this._metadata;
//        }
};

/*
 * Hook up gallery to global bondi object
 */
bondi.gallery = new GalleryManager();