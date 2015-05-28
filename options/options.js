app.controller('OptionsController', function ($scope) {
  window.addEventListener('load', function() {
    	// Initialize the option controls.
  	options.focusLength.value = localStorage.focusLength;
  	options.shortBreakLength.value = localStorage.shortBreakLength;
  	options.longBreakLength.value = localStorage.longBreakLength;
  	options.notifications.checked = JSON.parse(localStorage.notifications);
  	options.sounds.checked = JSON.parse(localStorage.sounds);
    options.blockUnproductiveSites.checked = JSON.parse(localStorage.blockUnproductiveSites);
    $scope.blockUnproductiveSites = options.blockUnproductiveSites.checked;
    $scope.blockedSites = JSON.parse(localStorage.blockedSites);
    $scope.siteToAdd = "";
    $scope.$digest();

  	options.focusLength.onchange = function() {
    	localStorage.focusLength = options.focusLength.value;
  	};

  	options.shortBreakLength.onchange = function() {
    	localStorage.shortBreakLength = options.shortBreakLength.value;
  	};

  	options.longBreakLength.onchange = function() {
  	  localStorage.longBreakLength = options.longBreakLength.value;
  	};

  	options.notifications.onchange = function() {
  	  localStorage.notifications = options.notifications.checked;
  	};

  	options.sounds.onchange = function() {
  	  localStorage.sounds = options.sounds.checked;
  	};

    options.blockUnproductiveSites.onchange = function() {
      localStorage.blockUnproductiveSites = options.blockUnproductiveSites.checked;
      $scope.blockUnproductiveSites = options.blockUnproductiveSites.checked;
      $scope.$digest();
    };

    $scope.addBlockSite = function() {
      if ($scope.siteToAdd.length === 0)
        return;

      $scope.blockedSites.push($scope.siteToAdd);
      localStorage.blockedSites = JSON.stringify($scope.blockedSites);

      $scope.siteToAdd = "";
    }

    $scope.removeBlockSite = function(siteToDelete) {
      try {
        var index = $scope.blockedSites.indexOf(siteToDelete);
        if (index > -1) {
          $scope.blockedSites.splice(index, 1);
          localStorage.blockedSites = JSON.stringify($scope.blockedSites);
        }
      } catch(e) {
        console.log(e);
      }
    }

  });
});