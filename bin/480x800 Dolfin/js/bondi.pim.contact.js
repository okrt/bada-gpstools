/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

/*
 * Module pim.task
 */

function ContactArraySuccessCallback() {};

ContactArraySuccessCallback.prototype.onSuccess = function(contacts) {};

function ContactManager() {
    
    // Temporarily enable security just to populate configuration data
    var featureWrite = bondi.features['pim.contact.write'];
    var deviceWrite = bondi.features['pimContact.write'];
    bondi.features['pim.contact.write'] = true;
    bondi.features['pimContact.write'] = true;

    // Create native and SIM address books
    var nativeAddressBook = new AddressBook(false);
    var simAddressBook = new AddressBook(true);
    var addressBooks = [ nativeAddressBook, simAddressBook ];

    // Populate addressbooks with contacts using IDE configuration data
    var contacts = bondi.config.contact || [];
    for (var i = 0; i < contacts.length; i++) {
        var address = {};
        if (contacts[i].address) {
            address.number = contacts[i].address.number,
            address.street = contacts[i].address.street,
            address.postalcode = contacts[i].address.postalcode,
            address.city = contacts[i].address.city,
            // address.region = contacts[i].region,
            address.country = contacts[i].address.country
        } 
        var options = {
                name : contacts[i].name,
                nickName : contacts[i].nickName,
                telephone : contacts[i].telephone,
                mail : contacts[i].mail,
                photo : contacts[i].photo,
                address : address
        };
        var contact = nativeAddressBook.createContact(options);
        // we must add the contacts immediately rather than through the async API
        // because we restore the security configuration immediately
        nativeAddressBook.addContactNow(contact);
    }
    
    // restore security after config
    bondi.features['pim.contact.write'] = featureWrite;
    bondi.features['pimContact.write'] = deviceWrite;
    
    var getAddressBooks = function() {
        bondi.checkFeature('pim.contact.read');
        if (!bondi.policy.query('pimContact.read', null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }
        // return a copy of address books array
        return addressBooks.slice(0);
    };

    // Expose public objects by setting to this
    this.getAddressBooks = getAddressBooks;
};

ContactManager.prototype.getAddressBooks = function() {};

function AddressBook(isSim) {
    var internal = new Object();
    internal.itemType = Contact;

    // Set feature and device capabilities for security policy
    internal.featureRead = 'pim.contact.read';
    internal.featureWrite = 'pim.contact.write';
    internal.deviceCapabilityRead = 'pimContact.read';
    internal.deviceCapabilityWrite = 'pimContact.write';

    // Provide custom property validator and item filter
    internal.propertyValidator = new ContactPropertyValidator(isSim);
    internal.itemFilter = new ContactFilter();
    
    // Provide custom copy
    internal.copy = function(original) {
        var contactCopy = new Contact();
        contactCopy._id = original._id;
        contactCopy.name = original.name;
        contactCopy.nickName = original.nickName;
        contactCopy.telephone = original.telephone;
        contactCopy.mail = original.mail;
        contactCopy.photo = original.photo;
        if (original.address) {
            contactCopy.address = {};
            for (var key in original.address) {
                contactCopy.address[key] = original.address[key];
            }
        }
        return contactCopy;
    }
    
    // Provide custom createTask to pass isSim property
    var createContact = function(options) {
        pimItemList.checkSecurityPolicy(internal.featureWrite, internal.deviceCapabilityWrite);
        return new Contact(options, isSim);
    };
    
    var doAsync = function(func, successCallback, errorCallback, item) {
        try {
            pimItemList.checkSecurityPolicy(internal.featureWrite, internal.deviceCapabilityWrite);
            pimItemList.validateCallbacks(successCallback, errorCallback);
            
            var job = new TimedJob();
            var work = function(job, successCallback, errorCallback, item) {
                try {
                    func.apply(pimItemList, [item]);
                } catch (e) {
                    if (errorCallback && typeof errorCallback == "function") {
                        errorCallback(e);
                    }
                    return;
                }
                successCallback();      
            }
            job.start(work, [successCallback, errorCallback, item]);
            return job;
            
        } catch (e) {
            if (errorCallback && typeof errorCallback == "function") {
                errorCallback(e);
            }
            else {
                // throw error if null or invalid error callback 
                // this is to match functionality on device acc/to Deepak Mittal [deepak.m1@samsung.com]
                throw new DeviceAPIError(DeviceAPIError.INVALID_ARGUMENT_ERROR);
            }            
            return null; // return null if callback was called inline in async function
        } 
    };
    
    // Provide custom addContact because it is asynchronous
    var addContact = function(successCallback, errorCallback, contact) {
        return doAsync(pimItemList.addItem, successCallback, errorCallback, contact);
    };
    
    // Provide custom updateContact because it is asynchronous
    var updateContact = function(successCallback, errorCallback, contact) {
        return doAsync(pimItemList.updateItem, successCallback, errorCallback, contact);
    };

    // Provide custom deleteContact because it is asynchronous
    var deleteContact = function(successCallback, errorCallback, contact) {
        return doAsync(pimItemList.deleteItem, successCallback, errorCallback, contact);
    };

    
    var pimItemList = new PimItemList(this, internal);
    
    this.addContactNow = function(contact) {
        pimItemList.addItem(contact);
    }
    
    // use custom functions for these public APIs
    this.createContact = createContact;     
    this.addContact = addContact;
    this.updateContact = updateContact;
    this.deleteContact = deleteContact;
    
    // Use PimItemList common functions for these public APIs
    this.deleteAllContacts = pimItemList.clearItems;
    this.findContacts = pimItemList.findItems;
};

AddressBook.prototype.createContact = function(options) {};
AddressBook.prototype.addContact = function(successCallback, errorCallback, contact) {};
AddressBook.prototype.updateContact = function(successCallback, errorCallback, contact) {};
AddressBook.prototype.deleteContact = function(successCallback, errorCallback, contact) {};
AddressBook.prototype.deleteAllContacts = function(successCallback, errorCallback) {};
AddressBook.prototype.findContacts = function(successCallback, errorCallback, filter) {};

function Contact(options, isSim) {
    var internal = {};

    // Provide custom property validator to PimItem
    internal.propertyValidator = new ContactPropertyValidator(isSim);

    // Provide custom getSupportedPropertyKeys() to PimItem
    var getSupportedPropertyKeys = function() {
        if (isSim) {
            return [ 'name', 'telephone' ];
        } else {
            return [ 'name', 'nickName', 'address', 'telephone', 'mail', 'photo' ];
        }
    };
    internal.getSupportedPropertyKeys = getSupportedPropertyKeys;

    // Set the base Id string
    internal.baseId = 'contact_';

    // Use PimItem to initialize and delegate common APIs to
    var pimItem = new PimItem(this, options, internal);
    pimItem.initialize(this);
    this._id = pimItem.id;
    this.getProperty = pimItem.getProperty;
    this.setProperty = pimItem.setProperty;
    this.getSupportedPropertyKeys = pimItem.getSupportedPropertyKeys;
};

Contact.prototype = {
        get id() {
            return this._id;
        }
};
Contact.prototype.name = '';
Contact.prototype.nickName = '';
Contact.prototype.address = {};
Contact.prototype.photo = '';
Contact.prototype.telephone = '';
Contact.prototype.mail = '';

Contact.prototype.getProperty = function(propertyName) {};
Contact.prototype.getSupportedPropertyKeys = function() {};
Contact.prototype.setProperty = function(propertyName, propertyValue) {};

// Custom property validator for Contact
ContactPropertyValidator = function(isSim) {
    this.isSim = isSim;
};
ContactPropertyValidator.prototype = new PimItemPropertyValidator();
ContactPropertyValidator.prototype.validateProperty = function(key, value) {
    // Validate common SIM and native properties
    if (key === 'telephone') {
        return this.validatePhone(value);
    }
    else if (key === 'id' || key === 'name') {
        return this.validateString(value);
    }
    // Validate non-SIM properties
    if (!this.isSim) {
        if (key === 'nickName' || key === 'photo' || key === 'mail') {
            return this.validateString(value);
        } else if (key === 'address') {
            return this.validateAddress(value);
        }
    }
    return false;
};
ContactPropertyValidator.prototype.validatePhone = function(value) {
    // Entire string must be 0-9+*#
    var pattern = /^[0-9\+\*\#]*$/;
    if (typeof value === 'string') {
        return pattern.test(value);
    }
    return false;
};
ContactPropertyValidator.prototype.validateAddress = function(address) {
    if (address && typeof address === 'object') {
        for (var key in address) {
            if (!this.validateAddressProperty(key, address[key])) {
                return false;
            }
        }
        return true;
    }
    return false;
};
ContactPropertyValidator.prototype.validateAddressProperty = function(key, value) {
    if (key === 'street' || key === 'number' || key === 'postalcode' || key === 'city' || key === 'country') {
        return this.validateString(value);
    } else {
        return false;   // unsupported address property
    }
};

// Custom item filter for Contact
ContactFilter = function() {};
ContactFilter.prototype = new PimItemFilter();
ContactFilter.prototype.isMatch = function(key, value, filter) {
    // Ensure the value contains the filter string
    if (key === 'address') {
        for (var filterKey in filter) {
            if (!this.isMatch(filterKey, value[filterKey], filter[filterKey])) {
                return false;
            }
        }
        return true;
    } else if (typeof filter === 'string') {
        return this.isCaseSensitiveStringMatch(value, filter);
    }
    return value === filter;
};

/*
 * Hook up contact to global bondi.pim object
 */
bondi.pim.contact = new ContactManager();