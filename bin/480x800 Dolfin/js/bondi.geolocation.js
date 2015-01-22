/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function Geolocation(){
    this.currentLocation = new Coordinates(0, 0, 0, 0, 0, 0, 0);
    if (bondi.config.coordinate) {
        this.currentLocation = new Coordinates(
                bondi.config.coordinate.latitude,
                bondi.config.coordinate.longitude,
                bondi.config.coordinate.altitude,
                bondi.config.coordinate.accuracy,
                bondi.config.coordinate.altitudeAccuracy,
                bondi.config.coordinate.heading,
                bondi.config.coordinate.speed
                );
    }
    this.timestamp = 0;
    // handlers keeps track of all outstanding watch requests, only so that we can
    // validate the clearWatch id
    this.handlers = {};
};

Geolocation.prototype.validateParameters = function(successCallback, errorCallback, options) {
    // validate callback function and limits on options per spec.
    if (typeof successCallback !== 'function') {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }
     
    if (errorCallback && (typeof errorCallback !== 'function')) {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }
    
    if (options) {
        var timeout = options.timeout || 0;
        var maximumAge = options.maximumAge || 0;
        if (timeout < -1 || maximumAge < 0 || Math.floor(timeout) !== timeout || Math.floor(maximumAge !== maximumAge)) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
    }
};

/*
 * Original code comes from: Latitude/longitude spherical geodesy formulae &
 * scripts (c) Chris Veness 2002-2010
 * http://www.movable-type.co.uk/scripts/latlong.html Calculate the destination
 * point from current point with the given distance (meters) with the heading
 * 
 * @see http://williams.best.vwh.net/avform.htm#LL
 */
Geolocation.prototype.updateLocation = function() {
    var currentTime = new Date().getTime();
    if (this.currentLocation.speed > 0 && this.timestamp != 0) {
        var dist = (currentTime - this.timestamp)/1000 * this.currentLocation.speed;

        dist = dist/6378137;                // convert dist to angular distance in radians
        var bearing = this.toRadian(this.currentLocation.heading);
        var lat1 = this.toRadian(this.currentLocation.latitude)
        var lon1 = this.toRadian(this.currentLocation.longitude);
    
        var lat2 = Math.asin(Math.sin(lat1)*Math.cos(dist) + Math.cos(lat1)*Math.sin(dist)*Math.cos(bearing));
        var lon2 = lon1 + Math.atan2(Math.sin(bearing)*Math.sin(dist)*Math.cos(lat1), Math.cos(dist)-Math.sin(lat1)*Math.sin(lat2));
        lon2 = (lon2+3*Math.PI)%(2*Math.PI) - Math.PI;  // normalise to -180...+180
    
        this.currentLocation._latitude = this.toDegree(lat2);
        this.currentLocation._longitude = this.toDegree(lon2);
    }
    this.timestamp = currentTime;
};

Geolocation.prototype.createPosition = function() {
    return new Position(this.timestamp, new Coordinates(
            this.currentLocation.latitude,
            this.currentLocation.longitude,
            this.currentLocation.altitude,
            this.currentLocation.accuracy,
            this.currentLocation.altitudeAccuracy,
            this.currentLocation.heading,
            this.currentLocation.speed
            ));
}

Geolocation.prototype.toDegree = function(radians) {
    return (radians*180)/Math.PI;
}

Geolocation.prototype.toRadian = function(degrees) {
    return (degrees*Math.PI)/180;
}

Geolocation.prototype.getCurrentPosition = function(successCallback, errorCallback, options) {
    try {
        bondi.checkFeature('geolocation.position');
        
        if (!bondi.policy.query('location.position', null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }
        
        this.validateParameters(successCallback, errorCallback, options);
        
        // set up an ansyc call back for position with short pause 
        // getting the location will take 1 second initiallly, and then 100 ms subsequently
        var self = this;
        var gpsSpeed = self.timestamp == 0 ? 1000 : 100;
        var userTimeout = -1;
        var maximumAge = 0;
        if (options) {
            userTimeout = options.timeout !== undefined ? options.timeout : -1;
            maximumAge = options.maximumAge || 0;
        }
        var cacheAge = new Date().getTime() - self.timestamp;
        
        // We need to handle three cases here, that we know before hand since we know our
        // gps gathering speed
        // 1. Timeout wins 
        //      a. no available cache       -> error (userTimeout elapsed)
        //      b. have a usable cache      -> return cached value (userTimeout elapsed)
        // 3. gpsSpeed wins                 -> return updated gps value (gpsSpeed elapsed)
        var action;
        var timeout;
        if (userTimeout >= 0 && userTimeout < gpsSpeed) {
            timeout = userTimeout;
            if (maximumAge < cacheAge) {
                // from http://dev.w3.org/geo/api/#get-current-position
                // If the attempt fails, and the method was invoked with a non-null 
                // errorCallback argument, this method must invoke the errorCallback 
                // with a PositionError object as an argument. 
                if (errorCallback) {
                    action = function() {
                        errorCallback(new PositionError(PositionError.TIMEOUT_ERROR, "bondi.geolocation.getCurrentPosition timeout"));
                    };
                }
                else {
                    action = function() {};
                }
            }
            else {
                action = function() {
                    successCallback(self.createPosition());
                };
            }
        }
        else {
            timeout = gpsSpeed;
            action = function() {
                self.updateLocation();
                successCallback(self.createPosition());
           };
        }
        
    }
    catch(err) {
        if (errorCallback && typeof errorCallback == 'function') {
            action = function() { errorCallback(err); };
            timeout = 1;
        }
        else {
            // throw error if null or invalid error callback 
            // this is to match functionality on device acc/to Deepak Mittal [deepak.m1@samsung.com]
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }     
    }
    
    setTimeout(action, timeout);  
};

Geolocation.prototype.watchPosition = function(successCallback, errorCallback, options) {
    // because of callbacks, error handling is treated in async style
    try {
        bondi.checkFeature('geolocation.position');
        
        if (!bondi.policy.query('location.position', null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }
        
        this.validateParameters(successCallback, errorCallback, options);
        
        // set an interval based on our speed, and save the id for clearWatch
        // We aim for no finer grain than 5 meter changes (walking speed ~1.3 m/s)
        // and/or a frequency of no more than about 10 changes per second.
        var self = this;
        var speed = self.currentLocation.speed;
        var interval
        if (speed < 1) {
            speed = 1;              // maximum delay is 5 seconds given 5 meter granularity
        }
        interval = 1000*5/speed;    // granularity is 5 meter changes (rather than 1)
        if (interval < 100) {
            interval = 100;         // but no more than 10/s
        }
    
        var id = setInterval(function() { 
            // update the location and call success at specified intervals
            self.updateLocation();
            successCallback(self.createPosition());
        }, interval);
        self.handlers[id] = id;
        return id;
    }
    catch(err) {
        if (errorCallback && typeof errorCallback == 'function') {
            errorCallback(err);
        }
        else {
            // throw error if null or invalid error callback 
            // this is to match functionality on device acc/to Deepak Mittal [deepak.m1@samsung.com]
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
       }
    }
};

Geolocation.prototype.clearWatch = function(id) {
    bondi.checkFeature('geolocation.position');
 
    if (!bondi.policy.query('location.position', null, this)) {
        throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
    }

    if (id == null || this.handlers[id] === undefined) {
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    }
    delete this.handlers[id];

    clearInterval(id);
};

function Coordinates(lat, long, altitude, accuracy, altitudeAccuracy, heading, speed) {
    this._latitude = lat;
    this._longitude = long;
    this._altitude = altitude;
    this._accuracy = accuracy;
    this._altitudeAccuracy = altitudeAccuracy;
    this._heading = heading;
    this._speed = speed;
}

Coordinates.prototype = {
        get latitude() {
            return this._latitude;
        },
        get longitude() {
            return this._longitude;
        },
        get altitude() {
            return this._altitude;
        },
        get accuracy() {
            return this._accuracy;
        },
        get altitudeAccuracy() {
            return this._altitudeAccuracy;
        },
        get heading() {
            return this._heading;
        },
        get speed() {
            return this._speed;
        }
};

function Position(stamp, coordinates) {
    this._timestamp = stamp;
    this._coordinates = coordinates;
}

Position.prototype = {
        get timestamp() {
            return this._timestamp;
        },
        get coords() {
            return this._coordinates;
        }
};

function PositionError(code, message){
    this._code = code;
    this._message = message;
};

PositionError.prototype = {
        get code() {
            return this._code;
        },
        get message() {
            return this._message;
        }
};

PositionError.UNKNOWN_ERROR = 0;
PositionError.POSITION_UNAVAILABLE_ERROR = 2;
PositionError.TIMEOUT_ERROR = 3;

PositionError.prototype.UNKNOWN_ERROR = PositionError.UNKNOWN_ERROR;
PositionError.prototype.POSITION_UNAVAILABLE_ERROR = PositionError.POSITION_UNAVAILABLE_ERROR;
PositionError.prototype.TIMEOUT_ERROR = PositionError.TIMEOUT_ERROR;

/*
 * Hook up geolocation to global bondi object
 */
bondi.geolocation = new Geolocation();