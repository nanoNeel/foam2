/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Load this file and make your Angular module depend on the 'foam' module to
// get foam-view and foam-repeat directives in your code.
//
// Correct load order is Angular 1.5 and FOAM 2 (either order), this library,
// then your application module that uses Angular and this library.

/* globals angular: false */
angular.module('foam', []).directive('foamView', function() {
  return {
    restrict: 'A',
    scope: {
      // TODO: Make these one-way reactive bindings, probably.
      // Except for "as", that should just be a string.
      key: '<foamView',
      dao: '<foamDao',
      as: '@foamAs',
      delay: '@foamDelay'
    },
    priority: 2000,
    transclude: 'element',
    link: function($scope, element, attrs, controllers, transcludeFn) {
      var obj;
      var innerScope;

      var delay = typeof $scope.delay === 'undefined' ? 100 : $scope.delay;
      var as = $scope.as || 'object';

      // Subscription to changes inside the DAO.
      var daoSub;
      // Subscription to changes on the cloned object.
      var objSub;

      // Look up our FOAM object on the DAO.
      function initialStart() {
        $scope.dao.find($scope.key).then(hookUpObject);
        daoSub && daoSub.destroy();
        daoSub = $scope.dao.on.sub(function(sub, _, operation, obj) {
          if ( operation === 'reset' ) {
            initialStart();
          } else if ( obj.id === $scope.key ) {
            hookUpObject(obj);
          }
        });
      }

      $scope.$watch('key', initialStart);
      $scope.$watch('dao', initialStart);

      function hookUpObject(o) {
        innerScope[as] = obj = o.clone();
        innerScope.$apply();

        objSub && objSub.destroy();
        objSub = obj.propertyChange.sub(foam.X.merged(function(sub) {
          sub.destroy();
          $scope.dao.put(obj).then(hookUpObject);
        }, delay));
      }

      transcludeFn(function(clone, scope) {
        innerScope = scope;
        initialStart();
        element.after(clone);
      });
      // TODO: Do I need to add something extra to destroy that scope?
    }
  };
});

angular.module('foam').directive('foamRepeat', [ '$timeout',
    function($timeout) {
  return {
    restrict: 'A',
    scope: {
      // TODO: Make these one-way reactive bindings, probably.
      // Except for "as", that should just be a string.
      dao: '<foamRepeat',
      as: '@foamAs'
    },
    priority: 20000,
    transclude: 'element',
    link: function($scope, element, attrs, controllers, transcludeFn) {
      var cache = {};
      var as = $scope.as || 'object';
      var delay = 200;

      var listener = {
        put: onPut,
        remove: onRemove,
        reset: onReset,
        eof: function() { }
      };

      $scope.dao.pipe(listener);

      $scope.$watch('dao', function() {
        onReset();
        $scope.dao.pipe(listener);
      });

      function attachObject(obj) {
        obj.propertyChange.sub(foam.X.merged(function(sub) {
          sub.destroy();
          $scope.dao.put(obj);
        }, delay));
      }

      function onPut(obj) {
        var c = cache[obj.id];
        if ( c ) {
          var o = c.scope[as] = obj.clone();
          $timeout(function() { c.scope.$apply(); }, 0, false);
          attachObject(o);
          return;
        }

        // Otherwise we need to create a new clone, bind its scope, and save the
        // scope.
        c = { object: obj.clone() };
        attachObject(c.object);
        transcludeFn(function(clone, scope) {
          var end = element.clone(false);
          element.replaceWith(clone);
          clone.after(end);
          element = end;

          c.element = clone;
          c.scope = scope;
          scope[as] = c.object;
          cache[obj.id] = c;
        });
      }

      function remove(c) {
        c.element.remove();
        c.scope.$destroy();
      }
      // TODO: Optimization: Hide DOM nodes and reuse their scopes?

      function onRemove(obj) {
        var c = cache[obj.id];
        c && remove(c);
        delete cache[obj.id];
      }

      function onReset() {
        for ( var id in cache ) {
          remove(cache[id]);
        }
        cache = {};
      }
    }
  };
} ]);

angular.module('foam').directive('foamInternalInject', function() {
  return {
    link: function(scope, element, attrs, controller, transcludeFn) {
      // TODO: Include error message generation here, for production.
      var innerScope = scope.$new();
      transcludeFn(innerScope, function(clone) {
        element.empty();
        element.append(clone);
        element.on('$destroy', function() {
          innerScope.$destroy();
        });
      });
    }
  };
});

angular.module('foam').directive('foamDaoController', function() {
  return {
    restrict: 'E',
    scope: {
      dao: '<',
      selection: '=',
      controllerMode: '=',
      label: '<'
    },
    transclude: true,
    template: foam.String.multiline(function() {/*
      <div class="foam-dao-controller">
      <div class="foam-dao-controller-header">
      <span class="foam-dao-controller-label">{{label}}</span>
      <button class="foam-dao-controller-create" ng-click="doCreate()">
      New
      </button>
      </div>
      <div class="foam-dao-controller-list">
      <div foam-repeat="dao" ng-click="doEdit(object)" foam-internal-inject>
      </div>
      </div>
      </div>
    */}),

    link: function(scope) {
      scope.doCreate = function doCreate() {
        var obj = foam.lookup(scope.dao.of).create();
        scope.selection = obj;
        scope.controllerMode = 'create';
      };

      scope.doSave = function doSave() {
        scope.dao.put(scope.selection);
        scope.selection = null;
        scope.controllerMode = 'none';
      };

      scope.controllerMode = 'none';

      scope.doEdit = function doEdit(item) {
        scope.controllerMode = 'edit';
        scope.selection = item;
      };

      scope.dao.select().then(function(a) {
        scope.array = a.a;
        scope.$apply();
      });
    }
  };
});

