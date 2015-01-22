/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function AppLauncherManager() {
    var BROWSER = "browser";
    var SSL_BROWSER = "sslBrowser";     // not to be included in knownNames
    var EMAIL = "email";
    var PHONE = "phone";
    var SMS = "sms";
    var MMS = "mms";
    var MEDIAPLAYER = "mediaplayer";
    var HTTP_PROTOCOL = "http://";
    var HTTPS_PROTOCOL = "https://";
    var MAIL_PROTOCOL = "mailto:";
  
    this.runtime = null;
    this.knownNames = [BROWSER, EMAIL, PHONE, SMS, MMS, MEDIAPLAYER];
    this.applicationMap = bondi.config.applauncher || new Object;

    function ProtocolBinding(protocol, name) {
        this.protocol = protocol;
        this.name = name;
    }

    this.supportedProtocols = [
                               new ProtocolBinding(HTTP_PROTOCOL, BROWSER), 
                               new ProtocolBinding(HTTPS_PROTOCOL, SSL_BROWSER), 
                               new ProtocolBinding(MAIL_PROTOCOL, EMAIL), 
                               new ProtocolBinding("tel:", PHONE), 
                               new ProtocolBinding("sms:", SMS), 
                               new ProtocolBinding("mms:", MMS)];
 
 
    this.launch = function(name, params) {
        var application = this.applicationMap[name];
        if (!application || application.length == 0) {
            var msg = name;
            for (var i in params) {
                msg += " " + params[i];
            }
            alert("Launched from bondi.applauncher: " + msg)
            return true;
        }
        else {
            return this.runtime.launch(application, params);
        }
    }
    
    this.toOSPath = function(path) {
        // The file system module does with a virtual file system naming externally
        // files are reported as documents/file... or wgt:private/file...
        // That is fine internally, but when launching a file, we need the OS path.
        // Replace wgt:private, with the appropriate OS prefix.
        if (path && path.length > 0) {
            var roots = bondi.config.filesystem || {};
            for (var i in roots) {
                if (path.indexOf(i) == 0) {
                    path = roots[i] + path.slice(i.length);
                    break;
                }
            }
        }
        return path;
    };
    
    this.map = {
            browser: function(params) {
                var url = params || "www.google.com"
                widget.openURL(HTTP_PROTOCOL + url);
                return true;
            },
            sslBrowser: function(params) {
                var url = params || "www.google.com"
                widget.openURL(HTTPS_PROTOCOL + url);
                return true;
            },
            email: function(params) {
                widget.openURL(MAIL_PROTOCOL + params);
                return true;
            },
            phone: function(params) {
                return this.launch(PHONE, params)
            },
            sms: function(params) {
                return this.launch(SMS, params)
            },
            mms: function(params) {
                return this.launch(MMS, params)
            },
            mediaplayer: function(params) {
                // If the request is "mediaplayer" by itself, then we 
                // launch the associated media player, but otherwise, we
                // directly open the file.  This allows the platform's default
                // media player to launch without requiring any user mapping.
                if (!params || params.length == 0) {
                    return this.launch(MEDIAPLAYER, [])
                }
                else {
                    return this.runtime.launch(this.toOSPath(params[0]))
                }
            },
            file: function(params) {
                var application = params.shift();
                application = this.toOSPath(application);
                if (!this.runtime.launch(application, params)) {
                    var msg = application;
                    for (var i in params) {
                        msg += " " + params[i];
                    }
                    alert("Launched from bondi.applauncher (verify path on device) file://" + msg)
                }
                return true;
            }
    };
};

AppLauncherManager.prototype.handleErrors = function(callback, param) {
    if (callback &&  typeof callback == "function") {
        callback(param);
    }
    else {
        // throw error if null or invalid error callback 
        // this is to match functionality on device acc/to Deepak Mittal [deepak.m1@samsung.com]
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }
};

AppLauncherManager.prototype.checkSecurityPolicy = function(feature, deviceCapability) {
    bondi.checkFeature(feature);
    if (!bondi.policy.query(deviceCapability, null, this)) {
        throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
    }
};

AppLauncherManager.prototype.validateCallbacks = function() {
    for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] !== "function") {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }               
    }
};

AppLauncherManager.prototype.launchApplication = function(successCallback, errorCallback, appURI, params) {
    try {
        
        this.checkSecurityPolicy("applauncher.launch", "applauncher.launch");
        this.validateCallbacks(successCallback, errorCallback);
        if (typeof appURI !== 'string' || appURI.length == 0) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        if (params !== undefined && params.length === undefined || typeof params === 'string') {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        
        // cache the plugin object for any future application launching
        if (!this.runtime) {
            this.runtime = document.getElementById('npbondiruntime');
        }
    
        // look up appURI in our launch map - if we find it, then they are calling an application by
        // name, and we can just launch it directly
        var func = this.map[appURI];
    
        // the appURI is not a known name - now map the appURI from the protocol in to a name + parameters
        // notice that this modifies the params argument because that is only used with the file protocol
        if (!func) {
            for (var i in this.supportedProtocols) {
                if (appURI.indexOf(this.supportedProtocols[i].protocol) == 0) {
                    func = this.map[this.supportedProtocols[i].name];
                    // create a single element parameter array with appURI after the protocol
                    params = [appURI.slice(this.supportedProtocols[i].protocol.length)];
                    break;
                }
            }
        }
        
        // now we have to special case the file:// protocol
        // the first item in params becomes the application path (without the protocol)
        if (!func) {
            var FILE = "file";
            var FILE_PROTOCOL = "file://";
            if (appURI.indexOf(FILE_PROTOCOL) == 0) {
                func = this.map[FILE];
                // add the path to the application as a parameter
                // our file handling launcher uses param[0] for the application path
                // (make sure we have a params array first)
                var application = appURI.slice(FILE_PROTOCOL.length);
                params = params || [];
                params.unshift(application);
            }
        }
        
        if (!func) {
            throw new DeviceAPIError(DeviceAPIError.NOT_FOUND_ERROR);
        }
        
        var self = this;
        var job = new TimedJob();
        var work = function(job, successCallback, errorCallback) {
            if (func.call(self, params)) {
                successCallback();
            }
            else if (errorCallback){
                errorCallback(new DeviceAPIError(DeviceAPIError.NOT_FOUND_ERROR));
            }
        }
        job.start(work, arguments);
        return job;
  
    }
    catch(err) {
        bondi.applauncher.handleErrors(errorCallback, err);
        // must return null if callback was called inline in async function
        return null;
    }

};

AppLauncherManager.prototype.getInstalledApplications = function(successCallback, errorCallback) {
    try {
        
        this.checkSecurityPolicy("applauncher.launch", "applauncher.launch");
        this.validateCallbacks(successCallback, errorCallback);
        
        var self = this;
        var job = new TimedJob();
        var work = function(job, successCallback, errorCallback) {
            var list = self.knownNames.slice(0);
            successCallback(list);
        }
        job.start(work, arguments);
        return job;
    
    }
    catch(err) {
        bondi.applauncher.handleErrors(errorCallback, err);
        // must return null if callback was called inline in async function
        return null;
    }
};

/*
 * getDefaultApplication is not implemented in WRT 1.0
 */
// AppLauncherManager.prototype.getDefaultApplication = function(mimeType) { };

/*
 * Hook up applauncher into global bondi object
 */
bondi.applauncher = new AppLauncherManager();