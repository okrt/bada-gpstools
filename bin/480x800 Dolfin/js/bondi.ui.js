/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function UIManager() {
    this.vibrateLeft = ["0px", "2px"];
    this.vibrateIntervalID = null;
    this.vibrateTickCount = 0;
    this.VIBRATE_FREQUENCY = 50;
    this.vibrateDuration = 0;
};

UIManager.prototype.checkSecurityPolicy = function(feature, deviceCapability) {
    // acc/to specification, "No permissions are required for this package."
};

UIManager.prototype.beep = function(duration, frequency) {
    this.checkSecurityPolicy("ui", "ui");

    // webkit takes over system sound, so a simple beep doesn't work
    // give the container a quick shake
    var container = parent.document.getElementById("uie-emulator-framediv");
    if (container) {
        container.style.left = "2px";
        container.style.top = "2px";
    }
    else {
        parent.window.moveBy(2, 2);
    }

    setTimeout(function() {
        if (container) {
            container.style.left = "0px";
            container.style.top = "0px";
        }
        else {
            parent.window.moveBy(-2, -2);
        }       
    }, 250)
};

UIManager.prototype.startVibrate = function(duration, intensity) {
    this.checkSecurityPolicy("ui", "ui");
    
    if (typeof duration !== "number") {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }

    this.vibrateIntervalID = null;
    this.vibrateTickCount = 0;
    this.vibrateDuration = 0;
    var self = this;
    this.vibrateIntervalID = setInterval(function() {
        // "uie-emulator-framediv" is the div for the frame widget container 
        // (see HTML_SOURCE in BrowserCommandLine.java)
        // If it doesn't exist, then we try to move the parent window.
        ++self.vibrateTickCount;
        var container = parent.document.getElementById("uie-emulator-framediv");
        if (container) {
            container.style.left = self.vibrateLeft[self.vibrateTickCount % 2];
        }
        else {
            var delta = self.vibrateTickCount % 2 ? 2 : -2;
            parent.window.moveBy(delta, 0);
        }
        self.vibrateDuration += self.VIBRATE_FREQUENCY;
        if (self.vibrateDuration >= duration) {
            self.stopVibrate();
        }
    }, self.VIBRATE_FREQUENCY);
};

UIManager.prototype.stopVibrate = function() {
    this.checkSecurityPolicy("ui", "ui");

    if (this.vibrateIntervalID) {
        clearInterval(this.vibrateIntervalID);
        var container = parent.document.getElementById("uie-emulator-framediv");
        if (container) {
           container.style.left = "0px";
        }
        else if (this.vibrateTickCount % 2) {
            // move back to original position if we have an odd number of moves
            parent.window.moveBy(-2, 0);
        }
    }
};

UIManager.prototype.setOnOrientationChange = function(handler) {
    this.checkSecurityPolicy("ui", "ui");

    if (typeof handler !== "function") {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }
    
    /*
     * NOTE: This is not fully implemented because we currently don't
     * allow the user to change the orientation in IDE/Preview.  
     * Implement this when we allow orientation changes.
     */
};

UIManager.prototype.startMannermode = function() {
    // no implementation in emulator
};

UIManager.prototype.stopMannermode  = function() {
   // no implementation in emulator
};

bondi.ui = new UIManager();