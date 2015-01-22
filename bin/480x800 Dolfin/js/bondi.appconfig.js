/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function AppConfigManager() { 
	this.properties = new Object();
};

AppConfigManager.prototype.get = function(key) {
    bondi.checkFeature('appconfig.get')

	// Test for string type for IFC-AS-650.1
	if (typeof key !== 'string') {
		throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
	}
	
	if (!bondi.policy.query('appconfig.get', [ key ], this)) {
		throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
	}
	
	// TODO Need to check against persistent properties
	return this.properties[key];
};

AppConfigManager.prototype.set = function(key, value){ 
    bondi.checkFeature('appconfig.set');
	
	// Test for string type for IFC-AS-650.1, IFC-AS-650.2
	if (typeof key !== 'string' || typeof value !== 'string') {
		throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
	}
	
	if (!bondi.policy.query('appconfig.set', [ key ], this)) {
		throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
	}
	
	// TODO Need to set this into persistent properties
	this.properties[key] = value;
};

/*
 * Hook up appconfig into global bondi object
 */
bondi.appconfig = new AppConfigManager();