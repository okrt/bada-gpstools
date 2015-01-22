/*
 * Copyright (c) 2010 UIEvolution. All rights reserved.
 */

function EmulatorTestManager(){};

EmulatorTestManager.prototype.geolocationHeadingAndSpeed = function(heading, speed) {
    bondi.geolocation.currentLocation._heading = heading;
    bondi.geolocation.currentLocation._speed = speed;
};

/*
 * Hook up emulator test object into global bondi object
 */
bondi.test = new EmulatorTestManager();