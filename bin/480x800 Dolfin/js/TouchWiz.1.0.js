/*******************************************************************************
 * Copyright (c) 2010 SAMSUNG. All rights reserved.
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 * 
 * The implementations here are only applicable to
 * an emulation environment.  We need to be careful
 * so that we don't override an emulator's native
 * widget object (or existing functions) if it exists.
 * We wrap every prototype in either a
 * 		if (window.widget)
 * or
 * 		if (typeof widget.<function> !== 'function')
 * 
 * Created 1.0 version on: 14 July 2010
 * By: jdance
 *******************************************************************************/

/*
 * This code snippit allows our widget to run in the Opera widget emulator
 * and is silently ignored in other browsers
 */
if (parent.emulator) {
	parent.emulator.begin(window);
}

/**
 * Object Widget() 
 * @constructor
 * @since TouchWiz 0.93
 */
function Widget() {
	// Set up preferences object
	this._prefs = new Object();
};

/**
 * Property widget
 * @type Widget
 * @memberOf Window
 * @addon
 */
if (!window.widget) {
     // Some browsers do not have a Window function, and thus no Window.prototype.
     // But Window.prototype is required for JavaScript content assistance.
     // The exception handling allows us to run this emulation library in both
     // types of browsers, with the fall back being to set widget as a property
     // on the window object itself.
	try {
	    /**
	     * widget is the root for all Samsung widget APIs
	     */
		Window.prototype.widget = new Widget();
	}
	catch(err) {
		window.widget = new Widget();
	}

	/*
	* Handle load so that we have a body to manipulate.     
	* In emulation mode, all widgets start with no scroll bars.
	*/
	
	if (window.addEventListener) {
		// Most browsers
		window.addEventListener('load', function () { document.body.style.overflow = 'hidden'; }, false);
	}
	else if (window.attachEvent) {
		// Internet Explorer
		window.attachEvent('onload', function () { document.body.style.overflow = 'hidden'; });
	}
}

/**
 * Rather than handling networking differently in each
 * widget environment, we wrap XMLHttpRequest in all.	
 * Wrap XMLHttpRequest for abort functionality (record in widget._activeXHR)
 * and to check network access (override send())
 * HTML initializes window._uieNetworkAccess.
 * 
 * The following two lines are inline...
 */
var _nativeXHR = window.XMLHttpRequest;
window.XMLHttpRequest = function() {
	var xhr = new _nativeXHR();
	xhr._nativeSend = xhr.send;
	xhr.send = function(data) {
		var network = false;
		if (window._uieNetworkAccess) {
			network = true;
		}
		if (!network) {
			throw ('Network access is disabled. See network access in widget configuration.');
		} 
		else {
			xhr._nativeSend(data);
		}
	};
	widget._activeXHR = xhr;
	return xhr;
};

if (typeof widget.openURL !== 'function') {
	/**
	* function <code>openURL(url)</code>
	* opens the url in the browser.
	* @param url {String} url to open in browser
	* @member Widget
	*/
	Widget.prototype.openURL=function(url) {
		window.open(url,'Emulator_Browser'); 
	};
}

if (typeof widget.setPreferenceForKey !== 'function') {
	/**
	* function <code>setPreferenceForKey(pref, key)</code>
	* saves the given preference in a persistent store.
	* The preference can be retrieved by the <code>key</code>.
	* @param pref The {String} preference value
	* @param key The {String} lookup key
	* @member Widget
	*/
	Widget.prototype.setPreferenceForKey=function(pref, key) { 
		this._prefs[key] = pref;
	};
}


if (typeof widget.preferenceForKey !== 'function') {
	/**
	* function <code>preferenceForKey(key)</code>
	* returns the preference previously saved by <code>key</code>
	* or the empty string if key is not found.
	* @param key The {String} lookup key
	* @return the preference value
	* @type String
	* @member Widget
	*/
	Widget.prototype.preferenceForKey=function(key) {
		if (this._prefs[key]) { 
			return this._prefs[key];
		}
		else {
			return '';
		}
	};
}

if (!widget.sysInfo)
{
	/**
	 * Property sysInfo in <code>widget</code>
	 * contains the function <code>getLanguage()</code>
	 * and <code>network</code> object.
	 * @type WidgetSysInfo
	 * @member Widget
	 */
	function WidgetSysInfo(){};
	Widget.prototype.sysInfo = new WidgetSysInfo();
	widget.sysInfo = new WidgetSysInfo();
}

if (typeof widget.sysInfo.getLanguage !== 'function') {
	/**
	* function <code>getLanguage()</code>
	* returns the language currently configured on the device.
	* The return value is the two letter language abbreviation
	* in the ISO 639-1 format. For example, 'en' for English.
	* @return The {String} current language setting
	* @type String
	* @member WidgetSysInfo
	*/
	WidgetSysInfo.prototype.getLanguage=function() { 
		return "en"; 
	};
}

if (!widget.sysInfo.network)
{
	/**
	 * Property network in <code>widget.sysInfo</code>
	 * contains the function <code>getIsNetworkAvailable()</code>.
	 * @type WidgetNetwork
	 * @member Widget.WidgetSysInfo
	 */
	function WidgetNetwork(){};
	WidgetSysInfo.prototype.network = new WidgetNetwork();
	widget.sysInfo.network = new WidgetNetwork();
}

if (typeof widget.sysInfo.network.getIsNetworkAvailable !== 'function') {
	/**
	* function <code>getIsNetworkAvailable()</code>
	* returns true if the device is allowed to use the network.
	* @return true if the device is allowed to use the network
	* @type Boolean
	* @member WidgetNetwork
	*/
	WidgetNetwork.prototype.getIsNetworkAvailable=function() { 
		return true; 
	};
}

if (!widget.sysInfo.SIM)
{
    /**
     * Property SIM in <code>widget.sysInfo</code>
     * contains the function <code>getMccMnc()</code>.
     * @type WidgetSIM
     * @member Widget.WidgetSysInfo
     */
    function WidgetSIM(){};
    WidgetSysInfo.prototype.SIM = new WidgetSIM();
    widget.sysInfo.SIM = new WidgetSIM();
}

if (typeof widget.sysInfo.network.getMccMnc !== 'function') {
    /**
    * function <code>getMccMnc()</code>
    * Returns the value of MCC/MNC (“mobile country code/mobile network code”) from the SIM. 
    * This function can be used to limit widget services to a specific country or to a specific operator.
    * @return the value of MCC/MNC
    * @type String
    * @member WidgetSIM
    */
    WidgetSIM.prototype.getMccMnc=function() { 
        return "310014"; 
    };
}
if (!widget.window)
{
	/**
	 * Property window in <code>widget</code>
	 * contains the functions <code>resizeWindow()</code>
	 * and <code>setScroll</code>.
	 * @type WidgetWindow
	 * @member Widget
	 */	
	function WidgetWindow(){};
	Widget.prototype.window = new WidgetWindow();
	widget.window = new WidgetWindow();
}

if (typeof widget.window.resizeWindow !== 'function') {
	/**
	* function <code>resizeWindow(width, height)</code>
	* resizes the widget window to width and height.
	* On Windows Mobile, use <code>window.resizeTo</code>
	* @param width {Number} The width of window
	* @param height {Number} The height of window
	* @member WidgetWindow
	*/
	WidgetWindow.prototype.resizeWindow=function(width, height) {
		var frame = parent.document.getElementById('uie-emulator-frame');
		if (frame)
		{
			frame.width=Math.min(width, _uieScreenWidth) + 'px';
			frame.height=Math.min(height, _uieScreenHeight) + 'px';
			parent.window.resizeTo(width, height);
		}
		else
		{
			window.resizeTo(width, height);
		}
	
		/*
	 	* Because of WebKit bug in overflow:auto (see setScroll)
		* we use overflow:scroll, but that causes problems when we
		* resize the window because we really want auto.
		* So on window.resizeTo, switch to auto if we are currently set to scroll
		* (Ignore in any emulator with native handleSetScroll ... like Opera or bada)
		*/
	  	if (document.body.style.overflowY == 'scroll' && window.handleSetScroll == null)
	  	{
	  		document.body.style.overflowY = 'auto';
	  	}
	};
}

if (typeof widget.window.setScroll !== 'function') {
	/**
	* function <code>setScroll(show)</code>
	* displays or hides the scroll bar
	* Do not use on bada platform. 
	* Use flick scolling with css property overflow-y:auto.
	* @deprecated
	* @param show The {Boolean} setting to show or hide scrolling UI
	* @member WidgetWindow
	*/
	WidgetWindow.prototype.setScroll = function(show) {
	};
}

