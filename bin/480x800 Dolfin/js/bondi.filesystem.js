/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function FileSystemSuccessCallback() {};

PropertyChangeSuccessCallback.prototype.onSuccess = function(file) {};

function FileSystemManager() {
    
    /*
     * Public API
     */
    var getDefaultLocation = function(specifier, minFreeSpace) {
        validateMinFreeSpace(minFreeSpace)
        if (locations[specifier] !== undefined) {
            return specifier;
        }
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    };

    var getRootLocations = function() {
        var rootLocations = [];
        for (var name in locations) {
            if (locations[name] !== null) {
                rootLocations.push(name);
            }
        }
        return rootLocations;
    };
    
    var resolve = function(location) {
        checkReadSecurityPolicy();
        validateLocation(location);
        var fsPath = _internal.getFileSystemPathForVirtualPath(location);
        var pluginFile = getRuntime().resolve(fsPath);
        if (pluginFile === undefined) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        return new File(pluginFile);
    };
    
    // NOTE:  Commented out because not implemented in WRT 1.0
//    var registerEventListener = function(listener) {
//        checkReadSecurityPolicy();
//        validateFileSystemListener(listener);
//        for (var i = 0; i < listeners.length; i++) {
//            if (listeners[i] === listener) {
//                listeners[i] = listener;
//                return;
//            }
//        }
//        listeners.push(listener);
//    };
    
    // NOTE: Commented out because not implemented in WRT 1.0
//    var unregisterEventListener = function(listener) {
//        validateFileSystemListener(listener);
//        for (var i = 0; i < listeners.length; i++) {
//            if (listeners[i] === listener) {
//                listeners.splice(i, 1);
//                return;
//            }
//        }
//        // listener was not found
//        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
//    };
    
    // Expose public APIs by assigning to this
    this.getDefaultLocation = getDefaultLocation;
    this.getRootLocations = getRootLocations;
    this.resolve = resolve;
    
    // NOTE: Commented out because not implemented in WRT 1.0
    //this.registerEventListener = registerEventListener;
    //this.unregisterEventListener = unregisterEventListener;

    /*
     * Private implementations
     */
    var _internal = {};
    this._internal = _internal;
    
    // supported locations
    var locations = {
        'wgt:package' : null,
        'wgt:private' : null,
        'wgt:public' : null,
        'wgt:temp' : null,
        documents : null,
        images : null,
        videos : null,
        temp : null,
        sdcard : null
    };

    // Populate locations from IDE configuration
    var fsConfig = bondi.config.filesystem;
    for (var name in fsConfig) {
        // replace back-slashes with forward-slashes
        locations[name] = fsConfig[name].replace(/\\/g, '/');
    };
    
    /*
     * JD: Firefix doesn't like _runtime in script outside of the html event
     * handler (well, that doesn't sound right, but something is wrong here) So
     * get the object element here...
     */
    var _runtime = null;
    var getRuntime = function() {
        if (_runtime == null) {
            _runtime = document.getElementById('npbondiruntime');
        }
        return _runtime;
    }
    
    // assumes first segment is root and exists 
    this._internal.getFileSystemPathForVirtualPath = function(virtualPath) {
        var segments = virtualPath.split('/');
        var rootName = segments.shift();
        var fsRoot = locations[rootName];
        var fsSegments = [fsRoot].concat(segments);
        return fsSegments.join('/');
    };
    
    this._internal.getVirtualPathForFileSystemPath = function(fsPath) {
        for (var name in locations) {
            if (fsPath.indexOf(locations[name]) === 0) {
                var relativePath = fsPath.slice(locations[name].length);
                return name + relativePath;
            }
        }
        return null;
    };
    
    var listeners = [];
    
    // If defined, minFreeSpace must be an unsigned integer 
    var validateMinFreeSpace = function(value) {
        if (value !== undefined) {
            if (typeof value !== 'number' || value < 0 || value !== Math.floor(value)) {
                throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
            }
        }
    };
    
    var validateLocation = function(location) {
        if (typeof location !== 'string' || location.length === 0) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
    };
    
    // NOTE: Commented out because not implemented in WRT 1.0
//    var validateFileSystemListener = function(listener) {
//        if (!(listener instanceof FileSystemListener)) {
//            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
//        }
//    };

    var checkSecurityPolicy = function(feature, deviceCapability) {
        bondi.checkFeature(feature);
        if (!bondi.policy.query(deviceCapability, null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }
    };
    var checkReadSecurityPolicy = function() {
        checkSecurityPolicy('filesystem.read', 'filesystem.read');
    };
    var checkWriteSecurityPolicy = function() {
        checkSecurityPolicy('filesystem.write', 'filesystem.write');
    };
};

// maxPathLength is read-only 
FileSystemManager.prototype = {
    get maxPathLength() {
        return 128;
    }
};
FileSystemManager.prototype.getDefaultLocation = function(specifier, minFreeSpace) {};
FileSystemManager.prototype.getRootLocations = function() {};
FileSystemManager.prototype.resolve = function(location) {};
//NOTE: registerEventListener() and unregisterEventListener() not implemented in WRT 1.0

function FileSystemListener() {};
FileSystemListener.prototype.mountEvent = function(location) {};
FileSystemListener.prototype.unmountEvent = function(location) {};

function File(_file) {
    
    /*
     * Public API
     */
    var listFiles = function() {
        checkReadSecurityPolicy();
        validateIsNotDeleted();
        validateIsDirectory();
        
        // Get and wrap the files in new File objects
        var files = [];
        var _files = _file.listFiles();
        for (var i = 0; i < _files.length; i++) {
            var file = new File(_files[i]);
            files.push(file);
        }
        return files;
    }
    
    var open = function(mode, encoding) {
        // the spec is not clear if we need write only for 'w' or 'a', so we always
        // require write to match current device implementations
        checkReadSecurityPolicy();
        checkWriteSecurityPolicy();
        validateIsNotDeleted();
        validateIsFile();
        validateMode(mode);
        encoding = encoding === undefined ? 'UTF-8' : encoding; // default is UTF-8
        validateEncoding(encoding);
        
        var _fileStream = _file.open(mode, encoding);
        if (_fileStream === undefined) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
        return new FileStream(_fileStream, mode, encoding);
    };
    
    var copyTo = function(successCallback, errorCallback, filePath, overwrite) {
        try {
            checkWriteSecurityPolicy();
            validateCallbacks(successCallback, errorCallback);
            return asyncFileCopy(false, successCallback, errorCallback, filePath, overwrite);
        } catch (e) {
            handleErrors(errorCallback, e);
            return null; // return null if callback was called inline in async function
        } 
    };
    
    var moveTo = function(successCallback, errorCallback, filePath, overwrite) {
        try {
            checkWriteSecurityPolicy();
            validateCallbacks(successCallback, errorCallback);
            return asyncFileCopy(true, successCallback, errorCallback, filePath, overwrite);
        } catch (e) {
            handleErrors(errorCallback, e);
            return null; // return null if callback was called inline in async function
        }  
    };
    
    var createDirectory = function(dirPath) {
        checkWriteSecurityPolicy();
        validateIsNotDeleted();
        validateIsDirectory();
        validatePath(dirPath);
        validateFileDoesNotExist(dirPath);
        return createDeepPath(dirPath, true, true);
    };
    
    var createFile = function(filePath) {
        checkWriteSecurityPolicy();
        validateIsNotDeleted();
        validateIsDirectory();
        validatePath(filePath);
        validateFileDoesNotExist(filePath);
        return createDeepPath(filePath, false, false);
    };
    
    var resolve = function(filePath) {
        // File.resolve is different than FileManager.resolve
        // In this case, we can return a null if the file is not found
        checkReadSecurityPolicy();
        validateIsNotDeleted();
        validateIsDirectory();
        validatePath(filePath);
        var file = _file.resolve(filePath);
        if (file === undefined) {
            return null;
        }
        return new File(file);
    };
    
    var deleteDirectory = function(recursive) {
        checkWriteSecurityPolicy();
        validateIsNotDeleted();
        validateIsDirectory();
        if (recursive) {
            deleted = deletePluginFileRecursively(_file);
        } else {
            validateIsEmptyDirectory();
            deleted = deletePluginFile(_file);
        }
        return deleted;
    };
    
    var deleteFile = function() {
        checkWriteSecurityPolicy();
        validateIsNotDeleted();
        validateIsFile();
        deleted = deletePluginFile(_file);
        return deleted;
    };
    
    // Expose public API by adding to this
    this.listFiles = listFiles;
    this.open = open;
    this.copyTo = copyTo;
    this.moveTo = moveTo;
    this.createDirectory = createDirectory;
    this.createFile = createFile;
    this.resolve = resolve;
    this.deleteDirectory = deleteDirectory;
    this.deleteFile = deleteFile;

    /*
     * Implementation details
     */

    var _runtime = document.getElementById('npbondiruntime');
    var deleted = false;
    
    var validateIsNotDeleted = function() {
        if (deleted) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    };
    
    var validateIsFile = function() {
        if (!_file.isFile) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    };
    
    var validateIsDirectory = function() {
        if (!_file.isDirectory) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    };

    var validateIsEmptyDirectory = function() {
        var files = _file.listFiles();
        if (files.length !== 0) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    };
    
    // Mode must be one of "a", "r", or "w"
    var validateMode = function(mode) {
        if (mode === 'a' || mode === 'r' || mode === 'w') {
            return;
        }
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    };
    
    // If the encoding is defined, it must be either "UTF-8" or "ISO8859-1"
    var validateEncoding = function(encoding) {
        if (encoding === 'UTF-8' || encoding === 'ISO8859-1') {
            return;
        }
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    };
    
    var validatePath = function(path) {
        if (path === null || typeof path !== 'string') {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
        
        // validate all segments in the path
        var segments = path.split('/');
        for (var i = 0; i < segments.length; i++) {
            // make sure no segment is '.' or '..'
            if (segments[i] === '.' || segments[i] === '..') {
                throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
            }                    
        
            // All callers of validatePath "throw IO_ERROR if any characters in the path are not supported"
            // While BONDI does not specify unsupported characters, we use the FAT reserved character list, 
            // because FAT is commonly supported on devices.     
            var matches = segments[i].match(/[\<\>\:\"\/\\\|\?\*]/);
            if (matches !== null) {
                throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
            }
        }
    };
 
    var validateCallbacks = function() {
        for (var i = 0; i < arguments.length; i++) {
            if (!arguments[i] || typeof arguments[i] !== "function") {
                throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
            }               
        }
    };
    
    var handleErrors = function(errorCallback, error) {
        if (errorCallback && typeof errorCallback == "function") {
            errorCallback(error);
        }
        else {
            // throw error if null or invalid error callback 
            // this is to match functionality on device acc/to Deepak Mittal [deepak.m1@samsung.com]
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
       }
    };
    
    /*
     * Throws an IO_ERROR if the file already exists
     */
    var validateFileDoesNotExist = function(path) {
        var file = _file.resolve(path);
        if (file !== undefined) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    };
    
    /*
     * Creates a deep path by creating each directory in the path until the
     * final file is created
     */
    var createDeepPath = function(path, createSubDirs, isDirectory) {
        var segments = path.split('/');
        var parent = _file;
        
        // Iterate through the segments, verifying they exist or creating as needed
        for (var i = 0; i < segments.length - 1; i++) {

            // Resolve the current segment and create it if necessary
            var entry = parent.resolve(segments[i]);
            if (entry === undefined && createSubDirs) {
                entry = parent.createEntry(segments[i], true);
            }
            
            // the current segment must now exist or IO_ERROR should be thrown
            if (entry === undefined) {
                throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
            }

            // prepare for the next iteration
            parent = entry; 
        }
        
        // Finally create and return the requested file or directory
        var entry = parent.createEntry(segments[segments.length - 1], isDirectory);
        return new File(entry);
    };
    
    /*
     * Performs an asynchronous file copy or move. Error are passed as
     * parameters when error callback is called. If successful, the success
     * callback is called.
     */
    var asyncFileCopy = function(isMove, successCallback, errorCallback, path, overwrite) {
        var job = new TimedJob();
        var work = function(job, isMove, successCallback, errorCallback, path, overwrite) {
            try {
                validateIsNotDeleted();
                validateIsFile();
                validatePath(path);
                var fsPath = bondi.filesystem._internal.getFileSystemPathForVirtualPath(path);
                // If path is relative, then getFileSystemPathForVirtualPath returns empty,
                // so convert it to an absolute path from our _file object.
                if (fsPath.length == 0) {
                    var dstPath = removeSegments(_file.path, 1);
                    fsPath = dstPath + '/' + path;
                }
                var success = isMove ? _file.moveTo(fsPath, overwrite) : _file.copyTo(fsPath, overwrite);
                if (success) {
                    var pluginFile = _runtime.resolve(fsPath);
                    if (pluginFile !== undefined) {
                        successCallback(new File(pluginFile));
                        return;
                    }
                }
                errorCallback(new DeviceAPIError(DeviceAPIError.IO_ERROR));
            } catch (e) {
                errorCallback(new DeviceAPIError(DeviceAPIError.IO_ERROR));
            }
        }
        job.start(work, arguments);
        return job;
    };
    
    /*
     * Perform the actual deletion of this file or directory. Assumes all
     * required validation has already taken place. Throws IO_ERROR if delete
     * fails.
     */
    var deletePluginFile = function(pluginFile) {
        if (!pluginFile.deleteSelf()) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
        return true; // success
    };
    
    /*
     * Performs a recursive delete of the directory. Assumes all required
     * validation has already taken place. Throws IO_ERROR if delete fails.
     */
    var deletePluginFileRecursively = function(pluginFile) {
        // Recursively delete all children if there are any
        if (pluginFile.isDirectory) {
            var pluginFiles = pluginFile.listFiles();
            for (var i = 0; i < pluginFiles.length; i++) {
                var deleted = deletePluginFileRecursively(pluginFiles[i]); 
                if (!deleted) {
                    throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
                }
            }
        }
        
        // Finally delete the file itself
        return deletePluginFile(pluginFile);
    };
    
    /*
     * Removes the specified number of segments from the path
     */
    var removeSegments = function(path, numSegments) {
        var segments = path.split('/');
        var numSegments = Math.min(numSegments, segments.length);
        for (var i = 0; i < numSegments; i++) {
            segments.pop();
        }
        return segments.join('/');
    };
    
    /*
     * Gets the last segment of this path
     */
    var getLastSegment = function(path) {
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash !== -1) {
            return path.slice(lastSlash + 1);  // everything after last slash
        }
        return path;
    };
    
    /*
     * Gets the last segment of this path
     */
    var getFirstSegment = function(path) {
        var firstSlash = path.indexOf('/');
        if (firstSlash !== -1) {
            return path.slice(0, firstSlash);  // everything before first slash
        }
        return path;
    };
    
    /*
     * Returns true if the path is a root. Assumes valid path whose first
     * segment is the root.
     */
    var isRoot = function(path) {
        var segments = path.split('/');
        return segments.length === 1;
    }
    
    var virtualPath = bondi.filesystem._internal.getVirtualPathForFileSystemPath(_file.path);
    var root = getFirstSegment(virtualPath);
    
    // hide the implementation in a public (but internal looking) object that the getters can access
    this._internal = function() {
        var internal = {};    
        internal.parent = function() {
            validateIsNotDeleted();
            
            // BONDI spec states null is returned for root
            if (isRoot(virtualPath)) {
                return null; 
            }
            
            // return a new File for the parent path
            var path = removeSegments(_file.path, 1);
            return new File(_runtime.resolve(path));
        };
        internal.readOnly = function () {
            validateIsNotDeleted();
            return _file.readOnly;
        };
        internal.isFile = function() {
            validateIsNotDeleted();
            return _file.isFile;
        }
        internal.isDirectory = function() {
            validateIsNotDeleted();
            return _file.isDirectory;
        }
        internal.created = function() {
            validateIsNotDeleted();
            return new Date(parseInt(_file.created));
        }
        internal.modified = function() {
            validateIsNotDeleted();
            return new Date(parseInt(_file.modified));
        }
        internal.path = function() {
            validateIsNotDeleted();
            var path = removeSegments(virtualPath, 1);
            return path.length > 0 ? path + '/' : path; // include the slash unless root
        }, 
        internal.name = function() {
            validateIsNotDeleted();
            return getLastSegment(_file.path);
        }, 
        internal.absolutePath = function() {
            validateIsNotDeleted();
            return virtualPath;
        }, 
        internal.fileSize = function() {
            validateIsNotDeleted();
            if (_file.isFile) {
                return _file.fileSize;
            }
            return undefined; // return undefined for directories per BONDI spec
        }, 
        internal.metadata = function() {
            validateIsNotDeleted();
            return {}; // our platform doesn't support any additional metadata
        }
        
        return internal;
    }();
    
    var checkSecurityPolicy = function(feature, deviceCapability) {
        bondi.checkFeature(feature);
        if (!bondi.policy.query(deviceCapability, null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }
    };
    var checkReadSecurityPolicy = function() {
        checkSecurityPolicy('filesystem.read', 'filesystem.read');
    };
    var checkWriteSecurityPolicy = function() {
        checkSecurityPolicy('filesystem.write', 'filesystem.write');
    };
};

File.prototype = {
// NOTE:  Commented out because not implemented in WRT 1.0
//    get parent() {
//        return this._internal.parent();
//    },
    get readOnly() {
        return this._internal.readOnly();
    },
    get isFile() {
        return this._internal.isFile();
    },
    get isDirectory() {
        return this._internal.isDirectory();
    },
    get created() {
        return this._internal.created();
    },
    get modified() {
        return this._internal.modified();
    }, 
    get path() {
        return this._internal.path();
    }, 
    get name() {
        return this._internal.name();
    }, 
    get absolutePath() {
        return this._internal.absolutePath();
    }, 
    get fileSize() {
        return this._internal.fileSize();
    }
// NOTE:  Commented out because not implemented in WRT 1.0
//    get metadata() {
//        return this._internal.metadata(); 
//    }
};

File.prototype.listFiles = function() {};
File.prototype.open = function(mode, encoding) {};
File.prototype.copyTo = function(successCallback, errorCallback, filePath, overwrite) {};
File.prototype.moveTo = function(successCallback, errorCallback, filePath, overwrite) {};
File.prototype.createDirectory = function(dirPath) {};
File.prototype.createFile = function(filePath) {};
File.prototype.resolve = function(filePath) {};
File.prototype.deleteDirectory = function(recursive) {};
File.prototype.deleteFile = function() {};

function FileStream(_fileStream, mode, encoding) {
    var close = function() {
        open = false;
        _fileStream.close();
    };
    
    var read = function(charCount) {
        validateOpen();
        validateReadMode();
        validateCharCount(charCount);
        return _fileStream.read(charCount);
    };
    
// NOTE:  Commented out because not implemented in WRT 1.0
//    var readBytes = function(byteCount) {
//        validateOpen();
//        validateReadMode();
//        validateCharCount(byteCount);
//        return _fileStream.readBytes(byteCount);
//    };
    
    var write = function(stringData) {
        validateOpen();
        validateWriteMode();
        validateStringData(stringData);
        _fileStream.write(stringData);
    };
    
// NOTE:  Commented out because not implemented in WRT 1.0
//    var writeBytes = function(byteData) {
//        validateOpen();
//        validateWriteMode();
//        validateStringData(byteData);  // TODO should byteData be an array?
//        return _fileStream.writeBytes(byteData);
//    };
    
    // Expose public API by adding to this
    this.close = close;
    this.read = read;
    this.write = write;
// NOTE:  Commented out because not implemented in WRT 1.0
//    this.readBytes = readBytes;
//    this.writeBytes = writeBytes;
    
    var open = true;
    
    this._internal = function() {
        var internal = {};
        internal.getEof = function() {
            return _fileStream.eof;
        };
        
        internal.getBytesAvailable = function() {
            return _fileStream.bytesAvailable;
        };
        
        internal.getPosition = function() {
            return _fileStream.position;
        }
        
        internal.setPosition = function(pos) {
            validatePosition(pos);
            _fileStream.position = pos;
        };
        
        return internal;
    }();
    
    // throws IO_ERROR if the filestream is not open
    var validateOpen = function() {
        if (!open) {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    };
    
    // throws IO_ERROR if the stream is not in a read mode ('r')
    var validateReadMode = function() {
        if (mode !== 'r') {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    }
    
    // throws IO_ERROR if the stream is not in a write mode ('w' or 'a')
    var validateWriteMode = function() {
        if (mode !== 'w' && mode !== 'a') {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    }
    
    // throws IO_ERROR if char count is not a non-negative integer
    var validateCharCount = function(charCount) {
        if (typeof charCount === 'number' && charCount >= 0 && charCount === Math.floor(charCount)) {
            return;
        }
        throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
    };
    
    // throws IO_ERROR is position is not an integer between 0 and the last byte available (inclusive)
    var validatePosition = function(pos) {
        if (typeof pos === 'number' && Math.floor(pos) === pos) {
            if (pos >= 0) {
                if (mode === 'a' || mode === 'w'){
                    return; // valid - no check against bytesAvailable for writing
                }
                if (mode === 'r' && pos < (_fileStream.position + _fileStream.bytesAvailable)) {
                    return; // valid read position
                }
            }  
        }
        throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
    };
    
    // throws IO_ERROR if stringData is not a string
    var validateStringData = function(stringData) {
        if (typeof stringData !== 'string') {
            throw new DeviceAPIError(DeviceAPIError.IO_ERROR);
        }
    };
};
FileStream.prototype = {
        get eof() {
            return this._internal.getEof();
        },
        get bytesAvailable() {
            return this._internal.getBytesAvailable();
        },
        get position() {
            return this._internal.getPosition();
        },
        set position(pos) {
            return this._internal.setPosition(pos);
        }
};
FileStream.prototype.close = function() {};
FileStream.prototype.read = function(charCount) {};
FileStream.prototype.write = function(stringData) {};
// NOTE: In WRT 1.0, readBase64 and writeBase64 are not implemented
// FileStream.prototype.readBytes = function(byteCount) {};
// FileStream.prototype.writeBytes = function(byteData) {};

/*
 * Hook up filesystem to global bondi object
 */

bondi.filesystem = new FileSystemManager();