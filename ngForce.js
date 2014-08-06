/**
 * Copyright (C) 2012 by Matias Niemela
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
angular.module('Scope.safeApply', []).run(function($rootScope) {

  $rootScope.$safeApply = function() {
    var $scope, fn, force = false;
    if(arguments.length == 1) {
      var arg = arguments[0];
      if(typeof arg == 'function') {
        fn = arg;
      }
      else {
        $scope = arg;
      }
    }
    else {
      $scope = arguments[0];
      fn = arguments[1];
      if(arguments.length == 3) {
        force = !!arguments[2];
      }
    }
    $scope = $scope || this;
    fn = fn || function() { };
    if(force || !$scope.$$phase) {
      $scope.$apply ? $scope.$apply(fn) : $scope.apply(fn);
    }
    else {
      fn();
    }
  };

});

/*
 * ngForce - a visualForce remoting based Angular.js service for developing
 * Angular apps within Visualforce.
 *
 * Copyright (c)2013, Kevin Pooorman.
 * License: MIT
 *
 * Usage:
 *   This is modeled after the Angular builtin's $http and $resource modules
 *   Injection of this service into your controller, etc. exposes the
 *   ngForce object, and it's methods to your controller. These methods expose
 *   access via promise-based asyncronous Visualforce Remoting.
 *
 */

angular.module('ngForce', ['Scope.safeApply', 'restangular']);
angular.module('ngForce').factory('vfr', function($q, $rootScope) {
	var vfRemote = {};
	/*
	 * This section of code brought to you by Kevin O'Hara. 
	 * May I one day be half as awesome as he is.
	 *
	 * Kevin o'Hara released premote, a nice lib for wrapping
	 * visualforce remoting calls in a promise interface. this 
	 * function .send() is largely a gentle refactoring of his
	 * work, found in "premote" here:
	 *		https://github.com/kevinohara80/premote
	 * such that it locks into the ng exec loop and utilizes
	 * the angular $q service, itself based on the Q lib
	 * Kevin uses.
	 */

	vfRemote.send = function(remoteAction, options, nullok) {
		var namespace, controller, method;
		var Manager = Visualforce.remoting.Manager;
		var parts = remoteAction.split('.');

		if (options && typeof options !== 'object') {
			throw new Error('Options must be an object');
		}
		//alert('===============In Send Method');

		if (parts.length < 2) {
			throw new Error('Invalid Remote Action specified. Use Controller.MethodName or $RemoteAction.Controller.MethodName');
		} else {
			if (parts.length === 3) {
				namespace = parts[0];
				controller = parts[1];
				method = parts[2];
			} else if (parts.length === 2) {
				controller = parts[0];
				method = parts[1];
			}
		}

		return function() {
			var deferred = $q.defer();
			var args;
			
			if (arguments.length) {
				args = Array.prototype.slice.apply(arguments);
			} else {
				args = [];
			}
			
			args.splice(0, 0, remoteAction);
			args.push(function(result, event) {
				handleResultWithPromise(result, event, nullok, deferred);
			});

			if (options) {
				args.push(options);
			}

			Manager.invokeAction.apply(Manager, args);
			return deferred.promise;
		};
	};

	handleResultWithPromise = function(result, event, nullok, deferred) {
		if (result) {
			result = JSON.parse(result);
			if (Array.isArray(result) && result[0].message && result[0].errorCode) {
				deferred.reject(result);
				$rootScope.$safeApply();
			} else {
				deferred.resolve(result);
				$rootScope.$safeApply();
			}
		} else if (typeof nullok !== 'undefined' && nullok) {
			deferred.resolve();
			$rootScope.$safeApply();
		} else {
			deferred.reject({
				message: "Null returned by RemoteAction not called with nullOk flag",
				errorCode: "NULL_RETURN"
			});
			$rootScope.$safeApply();
		}
	};

	/*
	 * Setup for ngForce3 style func calls
	 */

	var standardOptions = {
		escape: false,
		timeout: 10000
	};

	//upload Attachment
	vfRemote.uploadAttachment = vfRemote.send('ngForceController.uploadAttachment', standardOptions, false);
	//upload Attachments
	vfRemote.uploadAttachments = vfRemote.send('ngForceController.uploadAttachments', standardOptions, false);
	// Bulk Create
	vfRemote.bulkCreate = vfRemote.send('ngForceController.bulkCreate', standardOptions, false);
	// Bulk Delete
	vfRemote.bulkDelete = vfRemote.send('ngForceController.bulkDelete', standardOptions, false);
	// Bulk Update
	vfRemote.bulkUpdate = vfRemote.send('ngForceController.bulkUpdate', standardOptions, false);
	// Create
	vfRemote.create = vfRemote.send('ngForceController.create', standardOptions, false);
	// Clone
	vfRemote.clone = vfRemote.send('ngForceController.sObjectKlone', standardOptions, false);
	// Delete
	vfRemote.del = vfRemote.send('ngForceController.del', standardOptions, true);
	// Describe
	vfRemote.describe = vfRemote.send('ngForceController.describe', standardOptions, false);
	// Describe Field Set
	vfRemote.describeFieldSet = vfRemote.send('ngForceController.describeFieldSet', standardOptions, false);
	// Describe Picklist Values 
	vfRemote.getPicklistValues = vfRemote.send('ngForceController.getPicklistValues', standardOptions, false);
	// Get Object Type
	vfRemote.getObjectType = vfRemote.send('ngForceController.getObjType', standardOptions, false);
	// Get Query Results as select2 data
	vfRemote.getQueryResultsAsSelect2Data = vfRemote.send('ngForceController.getQueryResultsAsSelect2Data', standardOptions, false);
	// Query
	vfRemote.query = vfRemote.send('ngForceController.query', {
		escape: false,
		timeout: 30000
	}, false);
	// Query from Fieldset
	vfRemote.queryFromFieldset = vfRemote.send('ngForceController.queryFromFieldSet', {
		escape: false,
		timeout: 30000
	}, false);
	// Retrieve a field list for a given object.
	vfRemote.retrieve = vfRemote.send('ngForceController.retrieve', standardOptions, false);
	// Search (SOSL)
	vfRemote.search = vfRemote.send('ngForceController.search', standardOptions, false);
	// Soql from Fieldset
	vfRemote.soqlFromFieldSet = vfRemote.send('ngForceController.soqlFromFieldSet', standardOptions, false);
	// Update
	vfRemote.update = vfRemote.send('ngForceController.updat', standardOptions, true);
	// Upsert
	vfRemote.upsert = vfRemote.send('ngForceController.upser', standardOptions, true);
	//describe field
	vfRemote.describeField = vfRemote.send('ngForceController.describeField', standardOptions, false);
	//query customsetting
	vfRemote.queryCustomSetting = vfRemote.send('ngForceController.queryCustomSetting', standardOptions, false);
	//query existingRecords
	vfRemote.getExistingRecords = vfRemote.send('ngForceController.getExistingRecords', standardOptions, false);
	//get default record type of sobject
	vfRemote.getDefaultRecordType = vfRemote.send('ngForceController.getDefaultRecordType', standardOptions, false);
	//get creatable fields
	vfRemote.getCreatableFieldsSOQL = vfRemote.send('ngForceController.getCreatableFieldsSOQL', standardOptions, false);
	
	return vfRemote;
});



angular.module('ngForce').factory('sfr', function($q, $rootScope, Restangular) {
	var sfRest = {
		model: function(modelName) {
			return Restangular.
			setDefaultHeaders({
				'Authorization': 'Bearer ' + window.apiSid
			}).
			setBaseUrl('/services/data/v29.0/sobjects/').
			setRestangularFields({
				id: "Id"
			}).
			all(modelName);
		}
	};
	return sfRest;
});

angular.module('ngForce').factory('sfrquery', function($q, $rootScope, Restangular) {
	var sfrquery = Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('/services/data/v29.0/');
		RestangularConfigurer.setDefaultHeaders({
			'Authorization': 'Bearer ' + window.apiSid
		});
	}).setRestangularFields({
		id: "Id"
	}).all('query');

	return sfrquery;
});

angular.module('ngForce').factory('sfranalytics', function($q, $rootScope, Restangular) {
	var analytics = Restangular.withConfig(function(RestangularConfigurer) {
		RestangularConfigurer.setBaseUrl('/services/data/v29.0/analytics/');
		RestangularConfigurer.setDefaultHeaders({
			'Authorization': 'Bearer ' + window.apiSid
		});
	}).setRestangularFields({
		id: "Id"
	}).all('reports');

	return analytics;
});
