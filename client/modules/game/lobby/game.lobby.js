angular.module('app.game.lobby', [])
  .controller('GameLobbyCtrl', ['$rootScope', '$scope', '$state', '$location', function($rootScope, $scope, $state, $location){

    //Socket lobby listeners
    $rootScope.Socket.on('S_updatePlayer', function(data){
      $rootScope.user = data.player;
    });
    $rootScope.Socket.on('S_updateRooms', function(data){
      $scope.$apply(function(){
        $scope.rooms = data.rooms;
      });
    });

    $scope.openRoom = function(roomName, roomLimit){
      if(roomName != undefined){
        $state.go('game.room');
        $rootScope.Socket.emit('C_openRoom', {
          playerId: $rootScope.user.id,
          roomName: roomName,
          roomLimit: roomLimit
        });
      }
    };
    $scope.joinRoom = function(roomName){
      $state.go('game.room');
      $rootScope.Socket.emit('C_joinRoom', {
        roomName: roomName
      });
    };
    
    $scope.quitGame = function(){
      //hack
      $location.path('/');
    };

  }]);
