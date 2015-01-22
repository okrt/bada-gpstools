/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

/*
 * Module pim.task
 */

function TaskArraySuccessCallback() {};

TaskArraySuccessCallback.prototype.onSuccess = function(tasks) {};

function TaskManager() {
    
    // temporarily enable security just to populate configuration data
    var featureWrite = bondi.features['pim.task.write'];
    var deviceWrite = bondi.features['pimTask.write'];
    bondi.features['pim.task.write'] = true;
    bondi.features['pimTask.write'] = true;
    
    var taskList = new TaskList();
    var taskLists = [ taskList ];

    // Populate the task list with tasks from the IDE configuration
    var tasks = bondi.config.task || [];
    for (var i = 0; i < tasks.length; i++) {
        var options = {
            summary : tasks[i].summary,
            note : tasks[i].note,
            priority : tasks[i].priority,
            status : tasks[i].status,
            due : new Date(parseInt(tasks[i].due))
        };
        var task = taskList.createTask(options);
        taskList.addTask(task);
    }
    
    // restore security after config
    bondi.features['pim.task.write'] = featureWrite;
    bondi.features['pimTask.write'] = deviceWrite;
    
    this.getTaskLists = function() {
        bondi.checkFeature('pim.task.read');
        if (!bondi.policy.query('pimTask.read', null, this)) {
            throw new SecurityError(SecurityError.PERMISSION_DENIED_ERROR);
        }
        return taskLists;
    };
};

TaskManager.HIGH_PRIORITY = 0;
TaskManager.MEDIUM_PRIORITY = 1;
TaskManager.LOW_PRIORITY = 2;
TaskManager.STATUS_DONE = 0;
TaskManager.STATUS_PENDING = 1;
TaskManager.STATUS_ONGOING = 2;

TaskManager.prototype.HIGH_PRIORITY = TaskManager.HIGH_PRIORITY;
TaskManager.prototype.MEDIUM_PRIORITY = TaskManager.MEDIUM_PRIORITY;
TaskManager.prototype.LOW_PRIORITY = TaskManager.LOW_PRIORITY;
TaskManager.prototype.STATUS_DONE = TaskManager.STATUS_DONE;
TaskManager.prototype.STATUS_PENDING = TaskManager.STATUS_PENDING;
TaskManager.prototype.STATUS_ONGOING = TaskManager.STATUS_ONGOING;

TaskManager.prototype.getTaskLists = function() {};

function TaskList() {
    var internal = new Object();
    internal.itemType = Task;

    // Set feature and device capabilities for security policy
    internal.featureRead = 'pim.task.read';
    internal.featureWrite = 'pim.task.write';
    internal.deviceCapabilityRead = 'pimTask.read';
    internal.deviceCapabilityWrite = 'pimTask.write';

    // Provide custom property validator and item filter
    internal.propertyValidator = new TaskPropertyValidator();
    internal.itemFilter = new TaskFilter();
    
    // Provide custom copy
    internal.copy = function(original) {
        var taskCopy = new Task();
        taskCopy._id = original._id;
        taskCopy.summary = original.summary;
        taskCopy.note = original.note;
        taskCopy.status = original.status;
        taskCopy.priority = original.priority;
        if (original.due) {
            taskCopy.due = new Date(original.due.getTime());
        }
        return taskCopy;            
    }

    var pimItemList = new PimItemList(this, internal);
    this.addTask = pimItemList.addItem;
    this.createTask = pimItemList.createItem;
    this.updateTask = pimItemList.updateItem;
    this.deleteTask = pimItemList.deleteItem;
    this.clearTasks = pimItemList.clearItems;
    this.findTasks = pimItemList.findItems;
};

TaskList.prototype.createTask = function(options) {};
TaskList.prototype.addTask = function(task) {};
TaskList.prototype.updateTask = function(task) {};
TaskList.prototype.deleteTask = function(task) {};
TaskList.prototype.clearTasks = function(successCallback, errorCallback) {};
TaskList.prototype.findTasks = function(successCallback, errorCallback, filter) {};

/*
 * PimTask is the helper object and implements most of the code
 */
Task = function(options) {
    var internal = {};

    // Provide custom property validator to PimItem
    internal.propertyValidator = new TaskPropertyValidator();

    // Provide custom getSupportedPropertyKeys() to PimItem
    var getSupportedPropertyKeys = function() {
        return [ 'priority', 'note', 'due', 'summary', 'status' ];
    };
    internal.getSupportedPropertyKeys = getSupportedPropertyKeys;

    // Set the baseId for Task
    internal.baseId = 'task_';

    // Use PimItem to initialize and delegate common APIs to
    var pimItem = new PimItem(this, options, internal);
    pimItem.initialize(this);
    this._id = pimItem.id;
    this.getProperty = pimItem.getProperty;
    this.setProperty = pimItem.setProperty;
    this.getSupportedPropertyKeys = pimItem.getSupportedPropertyKeys;

};
Task.prototype = {
        get id() {
            return this._id;
        }
};
Task.prototype.note = '';
Task.prototype.summary = '';
Task.prototype.due = null;
Task.prototype.priority = TaskManager.MEDIUM_PRIORITY;
Task.prototype.status = TaskManager.STATUS_PENDING;

Task.prototype.getSupportedPropertyKeys = function() {};
Task.prototype.getProperty = function(propertyName) {};
Task.prototype.setProperty = function(propertyName, propertyValue) {};

// Custom property validator for Task
TaskPropertyValidator = function() {};
TaskPropertyValidator.prototype = new PimItemPropertyValidator();
TaskPropertyValidator.prototype.validateProperty = function(key, value) {
    if (key === 'id' || key === 'note' || key === 'summary') {
        return this.validateString(value);
    } else if (key === 'status' || key === 'priority') {
        return this.validateIntegerRange(value, 0, 2);
    } else if (key === 'due') {
        return this.validateDate(value);
    }
    return false;
};

// Custom item filter for Task
TaskFilter = function() {};
TaskFilter.prototype = new PimItemFilter();
TaskFilter.prototype.isMatch = function(key, value, filter) {
    // Ensure the value contains the filter string
    if (typeof filter === 'string') {
        return this.isCaseSensitiveStringMatch(value, filter);

        // For a date, match only the date part
    } else if (filter instanceof Date) {
        return value instanceof Date
                && value.getFullYear() === filter.getFullYear()
                && value.getMonth() === filter.getMonth()
                && value.getDate() === filter.getDate();
    }
    return value === filter;
};

/*
 * Hook up task to global bondi.pim object
 */
bondi.pim.task = new TaskManager();