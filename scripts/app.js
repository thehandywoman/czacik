(function () {
  'use strict';

  // Inicjacja Firebase
  var config = {
    apiKey: "AIzaSyCn-1QIqWrrejw0ajXz8Zk7KngqYadaUNQ",
    authDomain: "test-1433d.firebaseapp.com",
    databaseURL: "https://test-1433d.firebaseio.com",
    projectId: "test-1433d",
    storageBucket: "test-1433d.appspot.com",
    messagingSenderId: "655366613901"
  };
  firebase.initializeApp(config);

  var app = angular.module('chat', ['firebase', 'ngCookies']);
  var chat_container = document.getElementById('chat-messages');

  // Dostęp do bazy danych
  app.factory('firebaseSrv', ['$firebaseArray', function($firebaseArray) {
    return {
      // Lista użytkowników
      getUsers: function(){
        var ref = firebase.database().ref().child("users");
        return $firebaseArray(ref);
      },
      // Lista wiadomości
      getMessages: function(){
        var ref = firebase.database().ref().child("messages");
        return $firebaseArray(ref);
      }
    } 
  }]);

app.controller('chatCtrl', ['$scope', 'firebaseSrv', '$firebaseArray', '$timeout', function($scope, firebaseSrv, $firebaseArray, $timeout){
   $scope.users = [];
   $scope.messages = [];
   $scope.current_user = {
     online: false,
     nickname: null,
     uid: null
   };
   // Pobieranie listy użytkowników
   firebaseSrv.getUsers().$loaded().then(function(data){
     $scope.users = data;
// Pobieranie wiadomości
firebaseSrv.getMessages().$loaded().then(function(data){
   $scope.messages = data;
   $timeout(function(){
      scrollBottom();
   },50);
   //Obserwuj 'messages' i przewiń do nowej wiadomości gdy się pojawi
   $scope.messages.$watch(function(event) {
      if( event.event == 'child_added' ){
         $timeout(function(){
            scrollBottom();
         },50);
      }
   });
});
   });
}]);

app.controller('loginCtrl', ['$scope', '$cookieStore', '$timeout', function($scope, $cookieStore, $timeout){
  $scope.loading = false;
  // Tworzenie użytkownika
  $scope.loginUser = function(){
    if( $scope.loginForm.$valid ){
      $scope.loading = true;
      // Dodaj rekord do węzła users
      $scope.users.$add({ 
        nickname: $scope.loginForm.nickname,
        created_at: Math.floor(Date.now()/1000),
        online: true,
      }).then(function(ref){
        $timeout(function(){
          // Użytkownik dodany - zapisz dane w scope i w cookies
          $scope.current_user.online = true;
          $scope.current_user.nickname = $scope.loginForm.nickname;
          $scope.current_user.uid = ref.key;
          var now = new Date();
          var exp = new Date(now.getFullYear()+1, now.getMonth(), now.getDate());
          $cookieStore.put('chat_nickname', $scope.loginForm.nickname, { expires: exp });
          $cookieStore.put('chat_uid', ref.key, { expires: exp });
          $scope.loading = false;
          document.getElementById("chat-input").focus();
        },1000);
      });
    }
  }

// Jeżeli cookie istnieje
if( $cookieStore.get('chat_nickname') && $cookieStore.get('chat_uid') ){
  $scope.loading = true;
  // Logowanie automatyczne - ustaw status na true
  firebase.database().ref().child('users').child($cookieStore.get('chat_uid')).child('online').set(true).then(function(){
    $scope.current_user.online = true;
    $scope.current_user.nickname = $cookieStore.get('chat_nickname');
    $scope.current_user.uid = $cookieStore.get('chat_uid');
    $scope.loading = false;
    document.getElementById("chat-input").focus();
  });
}

// Wyloguj użytkownika gdy wychodzi ze strony
var exitEvent = window.attachEvent || window.addEventListener;
var onExitEvent = window.attachEvent ? 'onbeforeunload' : 'beforeunload'; 
exitEvent(onExitEvent, function(e) {  
  // Zmień status na false
  firebase.database().ref().child('users').child($scope.current_user.uid).child('online').set(false);
});

}]);

app.controller('inputCtrl', ['$scope','$timeout', function($scope, $timeout){
  // Wysyłanie wiadomości
  $scope.sendMessage = function(){
    if( $scope.messageForm.$valid ){
      // Dodaj rekord do węzła messages
      $scope.messages.$add({ 
        text: $scope.messageForm.text,
        user_uid: $scope.current_user.uid,
        user_nickname: $scope.current_user.nickname,
        created_at: Math.floor(Date.now()/1000)
      });
      // Wyczyść input
      $scope.messageForm.text = '';
    }
  }
}]);

})()