angular.module('app.game.lobby', [])
  .controller('GameLobbyCtrl', ['$rootScope', '$scope', '$state', '$location', function($rootScope, $scope, $state, $location){

    $scope.roomLimits = {
      3: "3 Players",
      5: "5 Players",
      6: "6 Players",
      7: "7 Players",
      8: "8 Players",
      9: "9 Players",
      10: "10 Players"
    };
    $scope.roomLimit = '5';

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
