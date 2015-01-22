/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

/*
 * Module pim.calendar
 */
function EventsArraySuccessCallback() {};

EventsArraySuccessCallback.prototype.onSuccess = function(obj) {};

function CalendarManager() {
    
    // Temporarily enable security just to populate configuration data
    var featureWrite = bondi.features['pim.calendar.write'];
    var deviceWrite = bondi.features['pimCalendar.write'];
    bondi.features['pim.calendar.write'] = true;
    bondi.features['pimCalendar.write'] = true;
    
    var calendar = new Calendar();
    var calendars = [ calendar ];

    // Populate calendar with events from IDE configuration
    var events = bondi.config.calendar || [];
    for (var i = 0; i < events.length; i++) {
        var options = {
            description : events[i].description,
            summary : events[i].summary,
            location : events[i].location,
            recurrence : events[i].recurrence,
            startTime : new Date(parseInt(events[i].startTime)),
            endTime : new Date(parseInt(events[i].endTime))
        };
        var event = calendar.createEvent(options);
        calendar.addEvent(event);
    }
    
    // Restore security after populating calendar with config events
    bondi.features['pim.calendar.write'] = featureWrite;
    bondi.features['pimCalendar.write'] = deviceWrite;

    this.getCalendars = function() {
        bondi.checkFeature('pim.calendar.read');
       
        if (!bondi.policy.query('pimEvent.read', null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }

        return calendars;
    };
};

CalendarManager.NO_RECURRENCE = 0;
CalendarManager.DAILY_RECURRENCE = 1;
CalendarManager.WEEKLY_RECURRENCE = 2;
CalendarManager.MONTHLY_RECURRENCE = 3;
CalendarManager.YEARLY_RECURRENCE = 4;

CalendarManager.prototype.NO_RECURRENCE = CalendarManager.NO_RECURRENCE;
CalendarManager.prototype.DAILY_RECURRENCE = CalendarManager.DAILY_RECURRENCE;
CalendarManager.prototype.WEEKLY_RECURRENCE = CalendarManager.WEEKLY_RECURRENCE;
CalendarManager.prototype.MONTHLY_RECURRENCE = CalendarManager.MONTHLY_RECURRENCE;
CalendarManager.prototype.YEARLY_RECURRENCE = CalendarManager.YEARLY_RECURRENCE;

CalendarManager.prototype.getCalendars = function() {};

function Calendar() {
    var internal = new Object();
    internal.itemType = Event;

    // Set feature and device capabilities for security policy
    internal.featureRead = 'pim.calendar.read';
    internal.featureWrite = 'pim.calendar.write';
    internal.deviceCapabilityRead = 'pimEvent.read';
    internal.deviceCapabilityWrite = 'pimEvent.write';

    // Provide custom property validator and item filter
    internal.propertyValidator = new EventPropertyValidator();
    internal.itemFilter = new EventFilter();
    
    // Provide custom copy
    internal.copy = function(original) {
        var eventCopy = new Event();
        eventCopy._id = original._id;
        eventCopy.description = original.description;
        eventCopy.summary = original.summary;
        eventCopy.location = original.location;
        eventCopy.recurrence = original.recurrence;
        if (original.startTime) {
            eventCopy.startTime = new Date(original.startTime.getTime());
        }
        if (original.endTime) {
            eventCopy.endTime = new Date(original.endTime.getTime());
        }
        return eventCopy;            
    }

    var pimItemList = new PimItemList(this, internal);
    this.addEvent = pimItemList.addItem;
    this.createEvent = pimItemList.createItem;
    this.updateEvent = pimItemList.updateItem;
    this.deleteEvent = pimItemList.deleteItem;
    this.clearEvents = pimItemList.clearItems;
    this.findEvents = pimItemList.findItems;
};

Calendar.prototype.createEvent = function(options) {};
Calendar.prototype.addEvent = function(event) {};
Calendar.prototype.updateEvent = function(event) {};
Calendar.prototype.deleteEvent = function(event) {};
Calendar.prototype.clearEvents = function(successCallback, errorCallback) {};
Calendar.prototype.findEvents = function(successCallback, errorCallback, filter) {};

/*
 * PimTask is the helper object and implements most of the code
 */
Event = function(options) {
    var internal = {};

    // Provide custom property validator
    internal.propertyValidator = new EventPropertyValidator();

    /*
     * Provide custom getSupportedPropertyKeys() to PimItem
     */
    var getSupportedPropertyKeys = function() {
        return [ 'description', 'summary', 'startTime', 'endTime', 'location', 'recurrence' ];
    };
    internal.getSupportedPropertyKeys = getSupportedPropertyKeys;

    /*
     * set the baseId for Event
     */
    internal.baseId = 'event_';

    // Use PimItem to initialize and delegate common APIs to
    var pimItem = new PimItem(this, options, internal);
    pimItem.initialize(this);
    this._id = pimItem.id;
    this.getProperty = pimItem.getProperty;
    this.setProperty = pimItem.setProperty;
    this.getSupportedPropertyKeys = pimItem.getSupportedPropertyKeys;

};

Event.prototype = {
        get id() {
            return this._id;
        }
};
Event.prototype.description = '';
Event.prototype.summary = '';
Event.prototype.startTime = null;
Event.prototype.endTime = null;
Event.prototype.location = '';
Event.prototype.recurrence = CalendarManager.NO_RECURRENCE;

Event.prototype.getSupportedPropertyKeys = function() {};
Event.prototype.getProperty = function(propertyName) {};
Event.prototype.setProperty = function(propertyName, propertyValue) {};

/*
 * Custom property validator for Events
 */
EventPropertyValidator = function() {};
EventPropertyValidator.prototype = new PimItemPropertyValidator();
EventPropertyValidator.prototype.validateProperty = function(key, value) {
    if (key === 'id' || key === 'priority' || key === 'description' || key === 'summary' || key === 'location') {
        return this.validateString(value);
    } else if (key === 'recurrence') {
        return this.validateIntegerRange(value, 0, 4);
    } else if (key === 'startTime' || key === 'endTime') {
        return this.validateDate(value);
    }
    return false;
};

EventFilter = function() {};
EventFilter.prototype = new PimItemFilter();
EventFilter.prototype.isMatch = function(key, value, filter) {
    // Ensure the value contains the filter string
    if (typeof filter === 'string') {
        return this.isCaseSensitiveStringMatch(value, filter);

        // Do full date and time comparison
    } else if (filter instanceof Date) {
        return value instanceof Date && value.getTime() === filter.getTime();
    }
    return filter === value;
};

/*
 * Hook up calendar to global bondi.pim object
 */
bondi.pim.calendar = new CalendarManager();
