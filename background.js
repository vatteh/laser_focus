var currentSession;
var currentTimer;
var currentInterval;
var secondsLeft;
var viewPort;
var focusBlocksFinished = 0; 
var maxAlarmTimeInSec;

var DEFAULT_MIN = {
	focus: 25,
	shortBreak: 5,
	longBreak: 15
};

// Conditionally initialize the options.
// if (!localStorage.isInitialized) {
	localStorage.focusLength = DEFAULT_MIN.focus;   
	localStorage.shortBreakLength = DEFAULT_MIN.shortBreak;
	localStorage.longBreakLength = DEFAULT_MIN.longBreak;
	localStorage.sessionHistory = '[]'; 
	localStorage.blockedSites = '[]';
	// localStorage.productiveSites = JSON.stringify(["stackoverflow.com", "google.com", "en.wikipedia.org"]);
	localStorage.notifications = true;
	localStorage.sounds = true;
	localStorage.blockUnproductiveSites = true;               
	localStorage.isInitialized = true;
// }

initBackground();

chrome.tabs.onUpdated.addListener(function(tabId, changedInfo, tab) {
	isSiteBlocked(tab);

    // if (isSiteBlocked(tab) || isSiteProductive(tab)) {
    // 	return;
    // } else if (currentTimer === 'focus' && once === false) {
    // 	chrome.tabs.executeScript(tab.id, {file: "content/content.js", runAt:"document_start"}, function() {
    //     	console.log("content loaded");
    //     	once = true;
    // 	});
    // }
});

chrome.tabs.onCreated.addListener(function(tab) {
    isSiteBlocked(tab);
});

currentSession = {
	startDate: null,
	endDate: null,
	taskList: [],
	blocksCompleted: 0
};

function isSiteBlocked(tab) {
	var sites = getBlockedSites();
	var blocked = false;

	for (var i = 0; i < sites.length; i++) {
	    if (JSON.parse(localStorage.blockUnproductiveSites) && tab.url.match(sites[i]) && currentTimer === 'focus') {
	        chrome.tabs.update(tab.id, { url: "newtab/newtab.html"}, function () {
	        	// viewport isnt defined at this point for some reason. Need to find alternate workaround!
	        	setTimeout(function() {
	        		viewPort.postMessage({'action': 'siteBlocked'});
	        	},1000);

	        });
	    	blocked = true;
	    	break;
	    }
	}

	return blocked;
}

function isSiteProductive(tab) {
	var sites = getProductiveSites();
	var productive = false;

	for (var i = 0; i < sites.length; i++) {
	    if (tab.url.match(sites[i]) && currentTimer === 'focus') {
	    	productive = true;
	    	break;
	    }
	}

	return productive;
}

function initBackground() {
	chrome.extension.onConnect.addListener(function(port) {
	    viewPort = port;
	    viewPort.onDisconnect.addListener(function() {
	      	viewPort = null;
	    });

	    viewPort.onMessage.addListener(function(msg) {
	      	if (msg.action === 'startTimerRequest') {
	        	startTimer(msg.value);
	      	}
	      	if (msg.action === 'stopTimerRequest') {
	      	  	stopTimer();
	      	}
	      	if (msg.action === 'timeLeftRequest') {
	      		viewPort.postMessage({'action': 'updatedTimeLeft', value: secondsLeft});
	      	}
	      	if (msg.action === 'focusCountRequest') {
	      		viewPort.postMessage({'action': 'updatedFocusCount', value: focusBlocksFinished});
	      	}
	      	if (msg.action === 'timerRequest') {
	      		viewPort.postMessage({'action': 'updatedCurrentTimer', value: currentTimer, maxSec: maxAlarmTimeInSec});
	      	}
	      	if (msg.action === 'taskListRequest') {
	      		viewPort.postMessage({'action': 'updatedTaskList', value: currentSession.taskList});
	      	}
	      	if (msg.action === 'updateTaskListRequest') {
	      		updateTaskList(msg.value);
	      	}
	      	if (msg.action === 'sessionHistoryRequest') {
	      		viewPort.postMessage({'action': 'updatedSessionHistory', value: JSON.parse(localStorage.sessionHistory)});
	      	}  
	    });
	});
}

function nextTimer() {
	if (currentTimer === 'focus' && (focusBlocksFinished % 4) === 0) {
		currentSession.blocksCompleted++;
		startTimer('longBreak');
		chrome.browserAction.setIcon({'path': 'images/blue-16.png'});
	} else if (currentTimer === 'focus') {
		currentSession.blocksCompleted++;
		startTimer('shortBreak');
		chrome.browserAction.setIcon({'path': 'images/green-16.png'});
	} else {
		startTimer('focus');
		chrome.browserAction.setIcon({'path': 'images/red-16.png'});
	}

	showNotification();
	playAlarm();
}

function updateTaskList(newTaskList) {
	currentSession.taskList = newTaskList;
}

function startTimer(type) {
	if (currentTimer === type)
		return;
	currentTimer = type;

	if (!currentSession.startDate) {
		currentSession.startDate = Date.now();
	}

	// check if current tab is on a non-productive site 
	if (currentTimer === 'focus') {
		chrome.tabs.query({
		    active: true,
		    lastFocusedWindow: true
		}, function(tabs) {
		    isSiteBlocked(tabs[0]);
		});
	}
	
	window.clearInterval(currentInterval);

	var alarmTime = localStorage[type + 'Length'] || DEFAULT_MIN[type];
  	maxAlarmTimeInSec = parseInt(alarmTime) * 60;
	
	// super short sessions for testing purposes

	if (currentTimer === 'focus') {
		maxAlarmTimeInSec = 15;
	} else if (currentTimer === 'shortBreak') {
		maxAlarmTimeInSec = 5;
	} else {
		maxAlarmTimeInSec = 8;
	}

	if(viewPort)
		viewPort.postMessage({'action': 'updatedCurrentTimer', value: currentTimer, maxSec: maxAlarmTimeInSec});

    var start = Date.now();

    function tick() {
        // get the number of seconds that have elapsed since 
        // startTimer() was called
        secondsLeft = maxAlarmTimeInSec - (((Date.now() - start) / 1000) | 0);

        if (secondsLeft <= 0) {
        	if (currentTimer === 'focus') {
        		focusBlocksFinished++;
        		if(viewPort)
        			viewPort.postMessage({'action': 'updatedFocusCount', value: focusBlocksFinished});
        	}
        	nextTimer();
        	return;
        }

        if(viewPort)
        	viewPort.postMessage({'action': 'updatedTimeLeft', value: secondsLeft, totalSessionTime: ((Date.now() - currentSession.startDate) / 1000 | 0)});

    };

    // we don't want to wait a full second before the timer starts
    tick();
    // now set the tick function to run every sec
    currentInterval = setInterval(tick, 1000);
}

function stopTimer() {
	if (!currentTimer)
		return;

	currentSession.endDate = Date.now();

	window.clearInterval(currentInterval);

	try {
		var sessionHistory = JSON.parse(localStorage.sessionHistory);

	 	sessionHistory.push({
	 		startDate: currentSession.startDate,
	 		endDate: currentSession.endDate,
	 		taskList: currentSession.taskList,
	 		blocksCompleted: currentSession.blocksCompleted
	 	});

	    localStorage.sessionHistory = JSON.stringify(sessionHistory);
	} catch(e) {
	  	console.log(e);
	}
	
	currentSession = {
		startDate: null,
		endDate: null,
		taskList: [],
		blocksCompleted: 0
	};

	focusBlocksFinished = 0;
	currentTimer = null;
	secondsLeft = 0;
	maxAlarmTimeInSec = 0;


	viewPort.postMessage({'action': 'updatedCurrentTimer', value: currentTimer, maxSec: maxAlarmTimeInSec});
	viewPort.postMessage({'action': 'updatedSessionHistory', value: JSON.parse(localStorage.sessionHistory)});

}

function showNotification() {
	if (!window.Notification || !JSON.parse(localStorage.notifications)) 
		return;

	if (currentTimer === 'longBreak') {
		new Notification('Long Break', {
		  	icon: 'images/blue-48.png',
		  	body: 'You just finshed 4 Focus Blocks. Time for a long break!'
		});
	} else if (currentTimer === 'shortBreak') {
		new Notification('Short Break', {
		  	icon: 'images/green-48.png',
		  	body: 'You just finshed a Focus Block. Time for a short break!'
		});
	} else {
		new Notification('Focus Block', {
		  	icon: 'images/red-48.png',
		  	body: 'Break time is over. Time to get back to work!'
		});
	}
}

function playAlarm() {
	if (!JSON.parse(localStorage.sounds)) 
		return;

	var myAudio = new Audio();        
	myAudio.src = "sounds/bell.wav"; 
	myAudio.volume = 0.1;
	myAudio.play();                   
}

function getBlockedSites() {
	return JSON.parse(localStorage.blockedSites);
}

function getProductiveSites() {
	return JSON.parse(localStorage.productiveSites);
}