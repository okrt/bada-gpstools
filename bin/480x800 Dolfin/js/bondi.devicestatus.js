/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function PropertyChangeSuccessCallback() {};
PropertyChangeSuccessCallback.prototype.onPropertyChange = function(property, newValue) {};

function DeviceStatusError(errorCode) {
    GenericError.call(this, errorCode);
};
DeviceStatusError.prototype = new GenericError();
DeviceStatusError.prototype.constructor = DeviceStatusError;

DeviceStatusError.READ_ONLY_PROPERTY_ERROR = 1;
DeviceStatusError.prototype.READ_ONLY_PROPERTY_ERROR = DeviceStatusError.READ_ONLY_PROPERTY_ERROR;

function AspectName(aspect, vocabulary) {
    this.aspect = aspect;
    this.vocabulary = vocabulary;
};
AspectName.prototype.aspect = new String();
AspectName.prototype.vocabulary = new String();

function PropertyRef(property, component, aspect, vocabulary) {
    this.property = property;
    this.component = component;
    this.aspect = aspect;
    this.vocabulary = vocabulary;
};
PropertyRef.prototype.vocabulary = new String();
PropertyRef.prototype.component = new String();
PropertyRef.prototype.aspect = new String();
PropertyRef.prototype.property = new String();

function DeviceStatusManager() {

    /*
     * Public API implementations
     */

    var listVocabularies = function() {
        checkListSecurityPolicy();
        return vocabularies.slice(0, vocabularies.length); // return copy
    };

    var setDefaultVocabulary = function(vocabulary) {
        // no security check required according to spec
        if (typeof vocabulary !== 'string' || vocabulary === '') {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        if (!(isValidVocabulary(vocabulary))) {
            throw new DeviceAPIError(DeviceAPIError.NOT_FOUND_ERROR);
        }
        // Do nothing since there is only one vocabulary now
    };

    var listAspects = function() {
        checkListSecurityPolicy();
        var names = [];
        for ( var name in aspects) {
            if (aspects.hasOwnProperty(name)) {
                names.push(name);
            }
        }
        return names;
    };

    var getComponents = function(aspectName) {
        checkListSecurityPolicy();
        validateVocabulary(aspectName.vocabulary);
        var aspect = getAndValidateAspect(aspectName.aspect);
        return aspect.getComponents();
    };

    var listProperties = function(aspectName) {
        checkListSecurityPolicy();
        validateVocabulary(aspectName.vocabulary);
        var aspect = getAndValidateAspect(aspectName.aspect);
        return aspect.getProperties();
    };

    var getPropertyValue = function(propertyRef) {
        checkGetSecurityPolicy();
        var copy = copyPropertyRef(propertyRef);
        validatePropertyRefAndApplyDefaults(copy);

        var aspect = aspects[copy.aspect];
        return aspect.getPropertyValue(copy.property, copy.component)
    };

    var setPropertyValue = function(propertyRef, value) {
        checkSetSecurityPolicy();
        var copy = copyPropertyRef(propertyRef);
        validatePropertyRefAndApplyDefaults(copy);
        validatePropertyIsWritable(copy.property, copy.aspect);

        var aspect = aspects[copy.aspect];
        aspect.setPropertyValue(copy.property, copy.component, value);
    };

    /*
     * NOTE: This will not be fully implemented because we are not
     * implementing a way for the variables to change value in the IDE. The
     * parameters will be validated and the the handle will be returned, 
     * and there will be one shot call to the listener, but it won't be
     * repeated after that.
     */
    var watchPropertyChange = function(propertyRef, listener, options) {
        checkGetSecurityPolicy();
        var propRefCopy = copyPropertyRef(propertyRef);
        validatePropertyRefAndApplyDefaults(propRefCopy);
        validateWatchListener(listener);

        var handler = new WatchHandler(propRefCopy, listener, options);
        addWatchHandler(handler);
        
        // do a one-shot call to the listener (in the future, this would change to
        // better use the handler)
        if (options && options.callCallbackOnRegister) {
            listener.onPropertyChange(propRefCopy, getPropertyValue(propRefCopy));
        }
        else {
            setTimeout(function() {
                handler.listener.onPropertyChange(propRefCopy, getPropertyValue(propRefCopy));
            }, 10);
        }
        
        return handler.id;
    };

    /*
     * NOTE: Even though we will not be fully implementing watch handlers in WRT
     * 1.0 we are fully implementing the spec for clearPropertyChange()
     */
    var clearPropertyChange = function(watchHandler) {
        checkGetSecurityPolicy();
        removeWatchHandler(watchHandler);
    };

    // Set public APIs to internal functions
// NOTE:  Commented out because not implemented in WRT 1.0
//    this.listVocabularies = listVocabularies;
//    this.setDefaultVocabulary = setDefaultVocabulary;
//    this.getComponents = getComponents;
//    this.setPropertyValue = setPropertyValue;
//    this.watchPropertyChange = watchPropertyChange;
//    this.clearPropertyChange = clearPropertyChange;
    this.listAspects = listAspects;
    this.listProperties = listProperties;
    this.getPropertyValue = getPropertyValue;

    /*
     * Implementation details below
     */

    /*
     * NOTE: In WRT 1.0, only BONDI vocabulary is supported and so
     * implementation has been simplified by assuming the BONDI vocabulary for
     * aspects, components and properties. All parameters are still checked and
     * for valid vocabularies and APIs function per spec. However, if more
     * vocabularies are added, implementation will need to be modified.
     */
    var vocabularies = [ 'http://bondi.omtp.org' ];

    // internal Property object
    function Property(implemented) {
        var values = [];
        var implemented = implemented;

        this.setValue = function(index, value) {
            values[index] = value;
        };
        this.getValue = function(index) {
            return values[index];
        }
        this.isImplemented = function() {
            return implemented;
        }
        this.setImplemented = function(isImplemented) {
            implemented = isImplemented;
        }
    }
    ;

    // internal Aspect object
    function Aspect(components, properties, implemented, implementedProperties) {

        // Map component and alias names to index into properties array
        this.components = {};
        this.aliases = {};
        for ( var i = 0; i < components.length; i++) {
            this.components[components[i][0]] = i;
            if (components[i][1]) {
                this.aliases[components[i][1]] = i;
            }
        }

        // Create an empty, unimplemented property object for each property
        this.properties = {};
        for ( var i = 0; i < properties.length; i++) {
            this.properties[properties[i]] = new Property(false);
        }

        // Has the aspect been implemented? Default to no.
        this.implemented = implemented || false;

        /*
         * There are only a few implemented properties so we can manually set
         * them here. In a future release with more implemented properties, we
         * may want a different constructor to simplify the passed parameters.
         */
        implementedProperties = implementedProperties || [];
        for ( var i = 0; i < implementedProperties.length; i++) {
            var name = implementedProperties[i];
            if (this.properties[name] !== undefined) {
                this.properties[name].setImplemented(true);
            }
        }

        // utility function to return the keys of an object as an array
        this.getKeys = function(object) {
            array = [];
            for ( var key in object) {
                array.push(key);
            }
            return array;
        }
    }
    ;

    // Returns the index into the properties array for the component. Assumes valid component.
    Aspect.prototype.getPropertyIndexForComponent = function(component) {
        if (component !== undefined) {
            if (this.components[component] !== undefined) {
                return this.components[component];
            }
            if (this.aliases[component] !== undefined) {
                return this.aliases[component];
            }
        }
        return 0; // default is first component
    };

    // Returns an array of the non-alias component names
    Aspect.prototype.getComponents = function() {
        return this.getKeys(this.components);
    };

    // Returns an array of the property names
    Aspect.prototype.getProperties = function() {
        return this.getKeys(this.properties);
    };

    // Returns the value for the specified property and component
    Aspect.prototype.getPropertyValue = function(name, component) {
        var property = this.properties[name];
        if (property !== undefined) {
            var index = this.getPropertyIndexForComponent(component);
            return property.getValue(index);
        }
        return undefined;
    };

    // Sets the value for the specified property and component
    Aspect.prototype.setPropertyValue = function(propertyName, component, value) {
        var property = this.properties[propertyName];
        if (property !== undefined) {
            var index = this.getPropertyIndexForComponent(component);
            property.setValue(index, value);
        }
    }

    // Assuming only one vocabulary. Work required if more are added
    var aspects = {};
    var propertyAspectMap = {}; // map of property to "default" aspect

    // NOTE: order is important for components. First item will be default.
    var addAspect = function(aspectName, components, properties, implemented, implementedProperties) {
        aspects[aspectName] = new Aspect(components, properties, implemented, implementedProperties);
        mapPropertiesToAspect(properties, aspectName);
    };

    // Allows lookup of aspect by property in case aspect is not specified
    var mapPropertiesToAspect = function(properties, aspectName) {
        for ( var i = 0; i < properties.length; i++) {
            propertyAspectMap[properties[i]] = aspectName;
        }
    };

    var addPropertyValue = function(aspectName, component, property, value) {
        var aspect = aspects[aspectName];
        if (aspect !== undefined) {
            aspect.setPropertyValue(property, component, value);
        }
    };

    var checkSecurityPolicy = function(feature, deviceCapability) {
        bondi.checkFeature(feature);
        if (!bondi.policy.query(deviceCapability, null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }
    };
    var checkGetSecurityPolicy = function() {
        checkSecurityPolicy('devicestatus.get', 'devicestatus.get');
    };
    var checkSetSecurityPolicy = function() {
        checkSecurityPolicy('devicestatus.set', 'devicestatus.set');
    };
    var checkListSecurityPolicy = function() {
        checkSecurityPolicy('devicestatus.list', 'devicestatus.list');
    };

    var copyPropertyRef = function(original) {
        return new PropertyRef(original.property, original.component, original.aspect, original.vocabulary)
    };

    // Returns true if the vocabulary exists
    var isValidVocabulary = function(vocabulary) {
        for ( var i = 0; i < vocabularies.length; i++) {
            if (vocabularies[i] === vocabulary) {
                return true;
            }
        }
        return false;
    };

    // If vocabulary is defined, it must be valid
    var validateVocabulary = function(vocabulary) {
        if (vocabulary !== undefined && !isValidVocabulary(vocabulary)) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
    };
    // Aspect must be defined and implemented
    var getAndValidateAspect = function(name) {
        if (name) {
            var aspect = aspects[name];
            if (aspect !== undefined) {
                if (!aspect.implemented) {
                    throw new DeviceAPIError(DeviceAPIError.NOT_FOUND_ERROR);
                }
                return aspect; // defined and implemented so valid
            }
        }
        throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
    };

    // component is permitted to be undefined but if defined must be valid
    var validateComponentForAspect = function(component, aspect) {
        if (component !== undefined) {
            if (aspect.components[component] === undefined && aspect.aliases[component] === undefined) {
                throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
            }
        }
    };

    // property must be defined and must exist
    var validateProperty = function(property) {
        if (property === undefined || propertyAspectMap[property] === undefined) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
    };

    // assuming property name and aspect are valid
    var validatePropertyIsImplementedForAspect = function(propertyName, aspect) {
        var property = aspect.properties[propertyName];
        if (property === undefined) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        if (!property.isImplemented()) {
            throw new DeviceAPIError(DeviceAPIError.NOT_FOUND_ERROR);
        }
    }

    var validatePropertyRefAndApplyDefaults = function(propertyRef) {
        // validate the supplied property and vocabulary
        validateProperty(propertyRef.property);
        validateVocabulary(propertyRef.vocabulary);

        // apply the default aspect if necessary and validate
        if (propertyRef.aspect === undefined) {
            propertyRef.aspect = propertyAspectMap[propertyRef.property];
        }
        var aspect = getAndValidateAspect(propertyRef.aspect);

        // verify the property is implemented for the aspect
        validatePropertyIsImplementedForAspect(propertyRef.property, aspect);

        // validate the component
        validateComponentForAspect(propertyRef.component, aspect);
    };

    // Throw READ_ONLY_PROPERTY_ERROR if the property is read-only
    var validatePropertyIsWritable = function(propertyName, aspectName) {
        // NOTE: Only one property is writable so we will simplify
        // implementation
        if (propertyName !== 'currentOrientation' || aspectName !== 'Display') {
            throw new DeviceStatusError(DeviceStatusError.READ_ONLY_PROPERTY_ERROR);
        }
    };

    /*
     * In WRT 1.0 we will not be implementing the actual watching. We will
     * simply add the watch handler with the appropriate properties. We plan on
     * implementing this in future versions.
     */
    WatchHandler = function(property, listener, options) {
        this.id = getNextHandlerId();
        this.property = property;
        this.listener = listener;
        this.options = {};
        for ( var name in options) {
            this.options[name] = options[name];
        }
    };
    var handlers = {};
    var nextHandlerId = 0;
    var getNextHandlerId = function() {
        return nextHandlerId++;
    };
    var addWatchHandler = function(handler) {
        handlers[handler.id] = handler;
    };
    var removeWatchHandler = function(id) {
        if (handlers[id] === undefined) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
        delete handlers[id];
    };
    var validateWatchListener = function(listener) {
        if (!listener || typeof listener !== 'object' || !listener.onPropertyChange) {
            throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
        }
    };

    /*
     * Populate with the supported and implemented aspects and properties
     */

    // some common components
    var NO_COMPONENTS = [];
    var DEFAULT = [ [ 'default', '__default' ] ];
    var ACTIVE_DEFAULT = [ [ 'active', '__active' ], [ 'default', '__default' ] ];
    var DEFAULT_ACTIVE = [ [ 'default', '__default' ], [ 'active', '__active' ] ];
    var CURRENT_DEFAULT = [ [ 'current', '__current' ], [ 'default', '__default' ] ];
    var PRIMARY_SECONDARY = [ [ 'primary', '__primary' ], [ 'secondary', '__secondary' ] ];

    // Battery Aspect
    var properties = [ 'batteryLevel', 'batteryCapacity', 'batteryTechnology', 'batteryTime', 'batteryBeingCharged' ];
    implementedProperties = [ 'batteryLevel', 'batteryBeingCharged' ];
    addAspect('Battery', PRIMARY_SECONDARY, properties, true, implementedProperties);

    // BluetoothHardware Aspect
    properties = [ 'status', 'bluetoothVersion' ];
    addAspect('BluetoothHardware', NO_COMPONENTS, properties);

    // CPU Aspect
    properties = [ 'architecture', 'currentFrequency', 'cacheSize', 'model', 'name', 'maxFrequency', 'vendor' ];
    addAspect('CPU', PRIMARY_SECONDARY, properties);

    // Camera Aspect
    properties = [ 'flashOn', 'maxZoom', 'minZoom', 'status', 'currentZoom', 'supportedFormats', 'resolutionHeight',
            'model', 'hasFlash', 'name', 'resolutionWidth', 'vendor' ];
    addAspect('Camera', PRIMARY_SECONDARY, properties);

    // Cellular Aspect
    properties = [ 'status' ];
    addAspect('CellularHardware', NO_COMPONENTS, properties);

    // Cellular Network Aspect
    properties = [ 'isInRoaming', 'mcc', 'signalStrength', 'networkStatus', 'cellID', 'networkTechnology', 'mnc',
            'operatorName' ];
    implementedProperties = [ 'signalStrength' ];
    addAspect('CellularNetwork', NO_COMPONENTS, properties, true, implementedProperties);

    // Device Network Aspect
    properties = [ 'imei', 'activeBluetoothProfile', 'bluetoothStatus', 'connectedDevices', 'model', 'version',
            'vendor', 'keyboardLocked', 'inputDevices' ];
    implementedProperties = [ 'imei', 'bluetoothStatus', 'keyboardLocked'];
    addAspect('Device', NO_COMPONENTS, properties, true, implementedProperties);

    // Display Aspect
    properties = [ 'height', 'width', 'displayLightIntensity', 'currentOrientation', 'resolutionHeight',
            'pixelAspectRatio', 'supportedOrientations', 'characterColumns', 'characterRows', 'dpiY',
            'resolutionWidth', 'dpiX', 'colorDepth', 'Font' ];
    var components = [ [ 'primary', '__active' ], [ 'secondary', '__default' ] ];
    implementedProperties = [ 'resolutionHeight', 'resolutionWidth', 'Font' ];
    addAspect('Display', components, properties, true, implementedProperties);

    // EmailClient Aspect
    properties = [ 'supportedFormats', 'version', 'name', 'vendor' ];
    addAspect('EmailClient', DEFAULT, properties);

    // JavaRuntimeEnvironment Aspect
    properties = [ 'j2meOptionalPackages', 'javaPlatforms', 'version', 'name', 'j2meConfigurations', 'vendor',
            'j2meProfiles' ];
    addAspect('JavaRuntimeEnvironment', DEFAULT_ACTIVE, properties);

    // MMSClient Aspect
    properties = [ 'supportedFormats', 'version', 'name', 'vendor' ];
    addAspect('MMSClient', ACTIVE_DEFAULT, properties);

    // MediaPlayer Aspect
    properties = [ 'supportedFormats', 'version', 'name', 'vendor' ];
    implementedProperties = [ 'supportedFormats' ];
    addAspect('MediaPlayer', DEFAULT_ACTIVE, properties, true, implementedProperties);

    // MediaRecorder Aspect
    properties = [ 'supportedFormats', 'version', 'name', 'vendor' ];
    addAspect('MediaRecorder', DEFAULT_ACTIVE, properties);

    // MemoryUnit Aspect
    properties = [ 'volatile', 'size', 'memoryTechnology', 'removable', 'availableSize' ];
    addAspect('MemoryUnit', DEFAULT, properties);

    // Microphone Aspect
    properties = [ 'status', 'volumeLevel', 'muted' ];
    addAspect('Microphone', NO_COMPONENTS, properties);

    // NetworkBearer Aspect
    properties = [ 'bearerTechnology', 'currentUploadBandwidth', 'currentDownloadBandwidth', 'apn', 'ipAddress' ];
    addAspect('NetworkBearer', CURRENT_DEFAULT, properties);

    // OperatingSystem Aspect
    properties = [ 'language', 'version', 'name', 'vendor' ];
    implementedProperties = [ 'language', 'version', 'name', 'vendor' ];
    addAspect('OperatingSystem', ACTIVE_DEFAULT, properties, true, implementedProperties);

    // SimCard Aspect
    properties = [ 'MSISDN', 'size', 'simStatus', 'availableSize' ];
    implementedProperties = [ 'MSISDN', 'size', 'simStatus', 'availableSize' ];
    addAspect('SimCard', NO_COMPONENTS, properties, true, implementedProperties);

    // Speaker Aspect
    properties = [ 'volumeLevel', 'muted' ];
    addAspect('Speaker', NO_COMPONENTS, properties);

    // StorageUnit Aspect
    properties = [ 'volatile', 'size', 'memoryTechnology', 'removable', 'availableSize', 'filesystem' ];
    addAspect('StorageUnit', DEFAULT, properties);

    // WapPushClient Aspect
    properties = [ 'version', 'name', 'vendor' ];
    addAspect('WapPushClient', DEFAULT_ACTIVE, properties);

    // WebBrowser Aspect
    properties = [ 'supportedFormats', 'version', 'name', 'vendor' ];
    addAspect('WebBrowser', CURRENT_DEFAULT, properties);

    // WebRuntime Aspect
    properties = [ 'supportedFormats', 'version', 'name', 'vendor' ];
    addAspect('WebRuntime', CURRENT_DEFAULT, properties);

    // WiFiHardware Aspect
    properties = [ 'status' ];
    addAspect('WiFiHardware', NO_COMPONENTS, properties);

    // WiFiNetwork Aspect
    properties = [ 'ssid', 'signalStrength', 'networkStatus', 'networkTechnology', 'encriptionType' ];
    implementedProperties = [ 'signalStrength' ];
    addAspect('WiFiNetwork', NO_COMPONENTS, properties, true, implementedProperties);

    function addAllProperties(config) {
        for (var i in config) {
            addPropertyValue(config[i].aspect, config[i].component, config[i].property, config[i].value);
        }
    }
    
    var defaultValues = [{ aspect: 'Battery', component: '__primary', property:'batteryBeingCharged',  value : false},
                     { aspect: 'Battery', component: '__primary', property:'batteryLevel',  value : 0},
                     { aspect: 'CellularNetwork', property:'signalStrength',  value : 0},
                     { aspect: 'Device', property:'imei',  value : ''},
                     { aspect: 'Device', component: '__active', property:'keyboardLocked',  value : false},
                     { aspect: 'OperatingSystem', component: '__active', property:'language',  value : 'en'},
                     { aspect: 'SimCard', property:'MSISDN',  value : ''},
                     { aspect: 'WiFiNetwork', property:'signalStrength',  value : 0}];
    
    // Populate property values first from default values, and then overlay configuration data
    addAllProperties(defaultValues);
    // now overlay with configuration data
    var config = bondi.config.devicestatus || [];
    addAllProperties(config)
};

//NOTE:  Commented out because not implemented in WRT 1.0
// DeviceStatusManager.prototype.listVocabularies = function() {};
// DeviceStatusManager.prototype.setDefaultVocabulary = function(vocabulary) {};
// DeviceStatusManager.prototype.getComponents = function(aspectName) {};
// DeviceStatusManager.prototype.setPropertyValue = function(propertyRef, value) {};
// DeviceStatusManager.prototype.watchPropertyChange = function(propertyRef, listener, options) {};
// DeviceStatusManager.prototype.clearPropertyChange = function(watchHandler) {};
DeviceStatusManager.prototype.listAspects = function() {};
DeviceStatusManager.prototype.listProperties = function(aspectName) {};
DeviceStatusManager.prototype.getPropertyValue = function(propertyRef) {};

/*
 * Hook up devicestatus to global bondi object
 */
bondi.devicestatus = new DeviceStatusManager();
