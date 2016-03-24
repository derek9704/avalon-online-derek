angular.module('app.welcome',[])
  .controller('WelcomeCtrl', ['$rootScope', '$scope', '$state', '$window', function($rootScope, $scope, $state, $window){

    $scope.fakeLogin = function(id){
      $rootScope.user = {
        id: id,
        name: id.toUpperCase()
      };     
      $state.go('game');
    };

  }]);
