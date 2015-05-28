'use strict';

var app = angular.module('StackathonApp',[]);
app.controller('PanelController', function ($scope) {

	$scope.backgroundPort = chrome.extension.connect();
	$scope.backgroundPort.postMessage({action:'timeLeftRequest'});
	$scope.backgroundPort.postMessage({action:'focusCountRequest'});
	$scope.backgroundPort.postMessage({action:'timerRequest'});
	$scope.backgroundPort.postMessage({action:'taskListRequest'});
	$scope.backgroundPort.postMessage({action:'sessionHistoryRequest'});

	$scope.backgroundPort.onMessage.addListener(function(msg) {
	  	if (msg.action === 'updatedTimeLeft') {
	  		$scope.secondsLeftPercent = (msg.value / $scope.maxSecondsLeft) * 100;
	    	$scope.secondsLeftFormatted = formatTimeLeft(msg.value);
	    	$scope.totalSessionTime = formatTimeLeft(msg.totalSessionTime);
	  	}

	  	if (msg.action === 'updatedFocusCount') {
	  		$scope.focusBlocksCompleted = msg.value;
	  	}

	  	if (msg.action === 'updatedCurrentTimer') {
	  	  	$scope.currentTimer = msg.value;
	  	  	$scope.maxSecondsLeft = msg.maxSec;
	  	  	updateProgressBarClass(msg.value);
			if ($scope.currentTimer) {
	  	  		$scope.startButtonText = "Finish Focus Session";
	  	  	} else {
	  	  		$scope.startButtonText = "Start Focus Session";
	  	  		$scope.taskList = [];
	  	  		$scope.totalSessionTime = "00:00";
	  	  	}
	  	}

	  	if (msg.action === 'updatedTaskList') {
	  		$scope.taskList = msg.value;
	  	}

	  	if (msg.action === 'updatedSessionHistory') {
	  		$scope.sessionHistory = msg.value;
	  	}

	  	if (msg.action === 'siteBlocked') {
	  		$scope.siteBlockedAlert = true;
	  	}

	  	$scope.$digest();
	});

	$scope.newTask = "";
	$scope.taskList = [];
	$scope.$watch("taskList", function() {
		$scope.backgroundPort.postMessage({action:'updateTaskListRequest', value: $scope.taskList});
	}, true );
	$scope.totalSessionTime = "00:00";
	$scope.noTaskAlert = false;
	$scope.unfinishedTasksAlert = false;
	$scope.siteBlockedAlert = false;

	function updateProgressBarClass(currentTimer) {
		if (currentTimer === 'longBreak') {
			$('.progress-bar').attr( "class", "progress-bar progress-bar-info" );
			$scope.subHeading = "Long Break";
		} else if (currentTimer === 'shortBreak') {
			$('.progress-bar').attr( "class", "progress-bar progress-bar-success" );
			$scope.subHeading = "Short Break";
		} else if (currentTimer === 'focus') {
			$('.progress-bar').attr( "class", "progress-bar progress-bar-danger" );
			$scope.subHeading = "Focus Block";
		} else {
			$scope.subHeading = "No Session in progress";
		}
	}

	function formatTimeLeft(diff) {

		var minutes = (diff / 60) | 0;
		var seconds = (diff % 60) | 0;

		minutes = minutes < 10 ? "0" + minutes : minutes;
		seconds = seconds < 10 ? "0" + seconds : seconds;
		
		return minutes + ":" + seconds;
	}

	$scope.submitNewTask = function() {
		if ($scope.newTask.length === 0) 
			return;
			
		var newTask = {
			dateAdded: Date.now(),
			task: $scope.newTask,
			completed: false
		};

		$scope.taskList.push(newTask);
		$scope.newTask = "";		
	}

	$scope.removeTask = function(taskToRemove) {
		for (var i = 0; i < $scope.taskList.length; i++) {
			if ($scope.taskList[i].dateAdded === taskToRemove.dateAdded) {
				$scope.taskList.splice(i, 1);
				break;
			}
		}
	}

	$scope.startSession = function() {
		if (!($scope.currentTimer)) {
			if ($scope.taskList.length === 0) {
				$scope.noTaskAlert = true;
				return;
			}

			$scope.noTaskAlert = false;
			$scope.backgroundPort.postMessage({action:'startTimerRequest', value:'focus'});
		} else {

			for(var i = 0; i < $scope.taskList.length; i++) {
				if (!$scope.taskList[i].completed) {
					$scope.unfinishedTasksAlert = true;
					return;
				}
			}

			$scope.unfinishedTasksAlert = false;
			$scope.backgroundPort.postMessage({action:'stopTimerRequest'});
		}
	}

	$scope.dismissUnfinishedTaskAlert = function(sessionOver) {
		if (sessionOver)
			$scope.backgroundPort.postMessage({action:'stopTimerRequest'});
		
		$scope.unfinishedTasksAlert = false;
	}

	$scope.formatDate = function(date) {
		var newDate = new Date(date);
		var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

		return months[newDate.getUTCMonth()] + ' ' + newDate.getUTCDate();
	}

	$scope.formatTime = function(date) {
		var newDate = new Date(date);

		var hours = newDate.getHours();
		var minutes = newDate.getMinutes();
		var ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0' + minutes : minutes;
		var strTime = hours + ':' + minutes + ' ' + ampm;
		
		return strTime;
	}

	$scope.formatTotalSessionLength = function(diff) {
		diff = (diff / 1000) | 0;

		var minutes = (diff / 60) | 0;
		var seconds = (diff % 60) | 0;
		var hours = minutes / 60 | 0;

		var hoursString = (hours !== 1) ? hours + " Hours, " : hours + " Hour, ";
		var minutesString = (minutes !== 1) ? minutes + " Minutes" : minutes + " Minute";
		var secondsString = (seconds !== 1) ? seconds + " Seconds" : seconds + " Second";
		
		if (hours === 0)
			hoursString = "";

		return hoursString + minutesString + " and " + secondsString;
	}

});
