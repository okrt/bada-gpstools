/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function Bondi() {};

function PendingOperation() {};

PendingOperation.prototype.cancel = function() {};

function ErrorCallback() {};

ErrorCallback.prototype.onError = function(error) {};

function SuccessCallback() {};

SuccessCallback.prototype.onSuccess = function() {};

function GenericError(errorCode) {
	this._code = errorCode;
};

GenericError.prototype = {
		get code() {
			return this._code;
		},
		get message() {
		    switch (this._code) {
		        case DeviceAPIError.UNKNOWN_ERROR:
                    return "Unknown error";
		        case DeviceAPIError.INVALID_ARGUMENT_ERROR:
                    return "Invalid value was specified as input parameter";
		        case DeviceAPIError.NOT_FOUND_ERROR:
                    return "The value or object was not found";
		        case DeviceAPIError.PENDING_OPERATION_ERROR:
                    return "Operation is pending";
		        case DeviceAPIError.IO_ERROR:
                    return "Input/Output error";
		        case DeviceAPIError.NOT_SUPPORTED_ERROR:
                    return "Not supported error";
		        case SecurityError.PERMISSION_DENIED_ERROR:
		            return "Permission denied";
		        default:
		            return "Error code: " + this._code;
		    }
		}
};

/**
 * DeviceAPIError inherits from GenericError, so this is set up with the
 * prototype chain, and constructor initialization.
 */
function DeviceAPIError(errorCode) {
	GenericError.call(this, errorCode);
};
DeviceAPIError.prototype = new GenericError();
DeviceAPIError.prototype.constructor = DeviceAPIError;

DeviceAPIError.UNKNOWN_ERROR = 10000;
DeviceAPIError.INVALID_ARGUMENT_ERROR = 10001;
DeviceAPIError.NOT_FOUND_ERROR = 10002;
DeviceAPIError.PENDING_OPERATION_ERROR = 10003;
DeviceAPIError.IO_ERROR = 10004;
DeviceAPIError.NOT_SUPPORTED_ERROR = 10005;

DeviceAPIError.prototype.UNKNOWN_ERROR = DeviceAPIError.UNKNOWN_ERROR;
DeviceAPIError.prototype.INVALID_ARGUMENT_ERROR = DeviceAPIError.INVALID_ARGUMENT_ERROR;
DeviceAPIError.prototype.NOT_FOUND_ERROR = DeviceAPIError.NOT_FOUND_ERROR;
DeviceAPIError.prototype.PENDING_OPERATION_ERROR = DeviceAPIError.PENDING_OPERATION_ERROR;
DeviceAPIError.prototype.IO_ERROR = DeviceAPIError.IO_ERROR;
DeviceAPIError.prototype.NOT_SUPPORTED_ERROR = DeviceAPIError.NOT_SUPPORTED_ERROR;

/**
 * SecurityError inherits from GenericError, so this is set up with the
 * prototype chain and constructor initialization.
 */
function SecurityError(errorCode) {
	GenericError.call(this, errorCode);
};
SecurityError.prototype = new GenericError();
SecurityError.prototype.constructor = SecurityError;

SecurityError.PERMISSION_DENIED_ERROR = 20000;

SecurityError.prototype.PERMISSION_DENIED_ERROR = SecurityError.PERMISSION_DENIED_ERROR;

Bondi.prototype.requestFeature = function(successCallback, errorCallback, uri) {
	// AS-0360:
	// A Widget Resource MUST indicate a dependency on a Feature using the
	// <feature> element defined in Widgets 1.0: Packaging and Configuration
    // [7].
	// So we ignore the request, but call successCallback.
	successCallback();
	return null;
};

/*
 * Create global bondi object
 */
window.bondi = new Bondi();

/*
 * Prepare for pim modules being attached to bondi.pim
 */
bondi.pim = new Object();

/*
 * Prepare for features and configuration being defined in preview data
 */
bondi.features = new Object();
bondi.config = new Object();

bondi.checkFeatureShowError = true;

/*
 * simple feature error checking function
 */
bondi.checkFeature = function(feature) {
    if (!bondi.features[feature]) {
        if (bondi.checkFeatureShowError) {
            alert("Feature: '" + feature + "' is not enabled. See Features tab in project.xml.");
        }
        throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
    }
}

/*
 * Capability queries for emulator
 */
bondi.policy = new Object();

/**
 * Query the policy for a specific capability, ie: 'io.file.write', given the
 * arguments to the write function, and the file system object.
 * 
 * @param capability
 *            The {String} capability desired, ie: 'io.file.write'
 * @param parameters
 *            The {arguments} to the original function
 * @param self
 *            The {Object} requesting the capability
 * @return Currently, query always returns true
 */
bondi.policy.query = function(capability, parameters, self) {
	return true;
}

/*
 * ///////////////////////////////////////////// Non-API utility objects
 */// //////////////////////////////////////////

/**
 * A simple, cancellable job that runs a supplied function asynchronously after
 * a specified amount of time. The job implements PendingOperation so it can be
 * returned from a Bondi function that returns PendingOperation.
 * 
 * @class TimedJob
 * @type {Object}
 * @constructor
 */
function TimedJob() {
	
};

// Extends PendingOperation
TimedJob.prototype = new PendingOperation();

/** Is the job done running? */
TimedJob.prototype.done = false;

/** Has the job been cancelled? */
TimedJob.prototype.cancelled = false;

/** Parameters passed to the TimedJob constructor */
TimedJob.prototype.params = new Object();

/** The default delay in ms before starting the work */
TimedJob.DEFAULT_START_DELAY = 10;

/**
 * Cancels the job. Returns true if the job was cancelled.
 * 
 * @see PendingOperation#cancel
 */
TimedJob.prototype.cancel = function() {
	if (!this.done) {
		this.cancelled = true;
		clearTimeout(this.invoker);
	}
	return this.cancelled;
}; 

/**
 * Indicates that the work for this job is finished.
 * 
 * IMPORTANT: This must be called by the work function after its work is
 * complete. Failure to do so may cause problems with calls to cancel().
 */
TimedJob.prototype.finish = function() {
	this.done = true;
};

/**
 * Starts the job with the supplied parameters asynchronously after a delay. A
 * reference to this object will be prepended to the argument list so that the
 * work function can access the job.
 * 
 * @param work
 *            {Function} The function that performs the actual work. This
 *            function must call finish() when it is done running.
 * @param args
 *            {Array} The arguments that will be passed to the work function
 * @param delay
 *            int The optional delay in milliseconds the job will wait before
 *            invoking work. If no delay is specified,
 *            TimedJob.DEFAULT_START_DELAY will be used.
 */
TimedJob.prototype.start = function(work, args, delay) {
	var self = this;
	this.work = work;
	
	// Copy args into new array in case user passed in arguments object
	this.params = new Array();
	for (var i = 0; i < args.length; i++) {
		this.params[i] = args[i];
	}
	
	if (delay === undefined) {
		delay = TimedJob.DEFAULT_START_DELAY;
	}

	// Invoke the work function with this and supplied parameters after delay
	this.invoker = setTimeout(function() {
		if (!self.cancelled) {
			self.work.apply(null, [ self ].concat(self.params));
		}
	}, delay);
};


/*
 * Helper object for individual PIM items: Task, Event, and Contact
 */
PimItem = function(instance, options, internal) {
	
	var validator = internal.propertyValidator || new PimItemPropertyValidator(); 
	
	var baseId = internal.baseId || 'id';
	
	var getNextId = internal.getNextId || function() {
		return baseId + PimItem.prototype.nextId++;  // arbitrary unique id
                                                        // string
	};
	
	var isWritableProperty = internal.isWritableProperty || function(key) {
		return key !== 'id';
	};
	
	var isSupportedPropertyKey = function(key) {
        var supportedKeys = getSupportedPropertyKeys();
        for (var i = 0; i < supportedKeys.length; i++) {
            if (key === supportedKeys[i]) {
                return true;
            }
        }
        return false;
    };
	
	/*
     * Implementations of common public PIM functions
     */
	var getProperty = function(key){
		if (instance[key] === undefined || !isSupportedPropertyKey(key)) {
		    if (key !== 'id') {
		        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
		    }
		}
		return instance[key];
	};
	
	var setProperty = function(key, value) {
		if (instance[key] === undefined || !validator.validateProperty(key, value) || !isWritableProperty(key)) {
	        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
		}
		instance[key] = value;
	};
	
	var getSupportedPropertyKeys = internal.getSupportedPropertyKeys || function() { return[] };
	
	var initialize = function(instance) {
		this.id = getNextId();
		
		validator.validateProperties(options);
		for (var key in options) {
			instance[key] = options[key];
		}
	};
	
	// Expose public functions by adding to this
	this.id = null;
	this.initialize = initialize;
	this.getProperty = getProperty;
	this.setProperty = setProperty;
	this.getSupportedPropertyKeys = getSupportedPropertyKeys;
};
PimItem.prototype.nextId = 0; 	// holds the next unique id

/*
 * Helper object for PIM item lists: (TaskList, Calendar, etc)
 */
PimItemList = function(instance, internal) {
	var items = [];
	
	var validator = internal.propertyValidator || new PimItemPropertyValidator();
	
	var checkSecurityPolicy = function(feature, deviceCapability) {
	    bondi.checkFeature(feature);
	    
	    if (!bondi.policy.query(deviceCapability, null, this)) {
			throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
		}
	};

	var validateCallbacks = function() {
		for (var i = 0; i < arguments.length; i++) {
			if (typeof arguments[i] !== 'function') {
				throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
			}				
		}
	};
	
	var handleErrors = function(errorCallback, e) {
        if (errorCallback && typeof errorCallback == "function") {
            errorCallback(e);
        }
        else {
            // throw error if null or invalid error callback 
            // this is to match functionality on device acc/to Deepak Mittal [deepak.m1@samsung.com]
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
	};
	
	var itemFilter = internal.itemFilter || new PimItemFilter();
	
	var validateItemType = function(item) {
		if (!(item instanceof internal.itemType)) {
			throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
		}
	};
	
	var getProperties = function(item) {
	    var properties = {};
	    for (var key in item) {
            if (item.hasOwnProperty(key) && key !== '_id') {
                if (typeof item[key] !== 'function') {
                    properties[key] = item[key];
                }
            }
        }
       return properties;
	};
	
	var validateItemProperties = function(item) {
	    validateItemType(item);
        internal.propertyValidator.validateProperties(getProperties(item));
	};
	
	var validateIsExistingItem = function(item) {
		validateItemType(item);
		if (items[item.id] === undefined) {
			throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
		}
	};
	
	var copy = internal.copy;

	var addItemToList = function(item) {
		items[item.id] = copy(item);	// store a copy by id
	};
	
	var deleteItemFromList = function(item) {
		delete items[item.id];
	};
	
	
	/*
     * Implementations of common public PIM functions
     */
	var createItem = function(options) {
		checkSecurityPolicy(internal.featureWrite, internal.deviceCapabilityWrite);
		return new internal.itemType(options);
	};
	
	var addItem = function(item) {
		checkSecurityPolicy(internal.featureWrite, internal.deviceCapabilityWrite);
		validateItemProperties(item);
		addItemToList(item);
	}
	
	var updateItem = function(item) {
		checkSecurityPolicy(internal.featureWrite, internal.deviceCapabilityWrite);
		validateIsExistingItem(item);
		validateItemProperties(item);
        addItemToList(item);	// same as adding an item
	}
	
	var findItems = function(successCallback, errorCallback, filter) {
	    try {
    		checkSecurityPolicy(internal.featureRead, internal.deviceCapabilityRead);
    		validateCallbacks(successCallback, errorCallback);
    		validator.validateProperties(filter);
    		
    		var job = new TimedJob();
    		var work = function(job, successCallback, errorCallback, filter) {
    			var filteredItems = itemFilter.filter(items, filter);
    			successCallback(filteredItems);		
    		}
    		job.start(work, arguments);
    		return job;
		
        } catch (e) {
            handleErrors(errorCallback, e);
            return null; // return null if callback was called inline in async function
        } 
	};
	
	var deleteItem = function(item) {
		checkSecurityPolicy(internal.featureWrite, internal.deviceCapabilityWrite);
		validateIsExistingItem(item);
		deleteItemFromList(item);
	};
	
	var clearItems = function(successCallback, errorCallback) {
        try {
            checkSecurityPolicy(internal.featureWrite, internal.deviceCapabilityWrite);
            validateCallbacks(successCallback, errorCallback);
            
            var job = new TimedJob();
            var work = function(job, successCallback, errorCallback) {
                items = [];
                successCallback();		
            }
            job.start(work, arguments);
            return job;
            
        } catch (e) {
            handleErrors(errorCallback, e);
            return null; // return null if callback was called inline in async function
        } 
	};
	

	// Expose public functions by adding to this
	this.checkSecurityPolicy = checkSecurityPolicy;
	this.validateCallbacks = validateCallbacks;
	this.addItem = addItem;
	this.createItem = createItem;
	this.updateItem = updateItem;
	this.deleteItem = deleteItem;
	this.clearItems = clearItems;
	this.findItems = findItems;
};

/*
 * Property validator for a pim item properties. The default validateProperty()
 * always returns true. This should be overridden by specific pim items.
 */
PimItemPropertyValidator = function() {};
PimItemPropertyValidator.prototype.validateProperties = function(properties) {
	for (var key in properties) {
		if (!this.validateProperty(key, properties[key])) {
			throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
		}
	}
};
PimItemPropertyValidator.prototype.validateProperty = function(key, value) {
	return true;
};
PimItemPropertyValidator.prototype.validateString = function(value) {
	return typeof value === 'string';
};
PimItemPropertyValidator.prototype.validateNumberRange = function(value, min, max) {
	return typeof value === 'number' && value >= min && value <= max;
};
// Ensure the value is an integer between min and max inclusive
PimItemPropertyValidator.prototype.validateIntegerRange = function(value, min, max) {
	return typeof value === 'number' && !isNaN(value) && value === Math.floor(value)
			&& value >= min && value <= max;  
};
PimItemPropertyValidator.prototype.validateDate = function(value) {
	return value instanceof Date;
};

PimItemFilter = function() {};
PimItemFilter.prototype.filter = function(items, filter) {
	var filteredItems = new Array();
	for (var id in items) {
		var matchesAllFilters = true;
		for (var key in filter) {
			if (!this.isMatch(key, items[id][key], filter[key])) {
				matchesAllFilters = false;
				break;
			}
		}
		if (matchesAllFilters) {
			filteredItems.push(items[id])
		}
	}
	return filteredItems;
};
PimItemFilter.prototype.isCaseSensitiveStringMatch = function(item, filter) {
    return typeof item === 'string' && item.indexOf(filter) !== -1;  
};
PimItemFilter.prototype.isMatch = function(key, value, filter) {
	return true;
};
