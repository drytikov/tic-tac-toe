const express = require('express');
const path = require('path');

let games = 0;

const server = express()
  .use(express.static('../build'))
  .get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  })
  .listen(process.env.PORT || 5000);

const io = require('socket.io')(server);

io.on('connection', (socket) => {
  // Создаем новую игру и уведомляем создателя игры
  socket.on('createGame', (data) => {
    socket.join(`game-${games += 1}`);
    socket.emit('newGame', { name: data.name, gameId: `game-${games}` });
  });

  // Подключаем второго игрока к игре, которую он запросил.
  // Выводим ошибки, если игра укомплектована или запрашиваемой игры не существует.
  socket.on('joinGame', (data) => {
    const game = io.nsps['/'].adapter.rooms[data.gameId];
    if (game && game.length === 1) {
      socket.join(data.gameId);
      socket.broadcast.to(data.gameId).emit('player1', { gameId: data.gameId });
      socket.emit('player2', { name: data.name, gameId: data.gameId });
    } else if (!game) {
      socket.emit('err', { message: 'Такой игры не существует!' });
    } else if (game.length >= 2) {
      socket.emit('err', { message: 'В этой игре больше нет места!' });
    }
  });

  // Передаем информацию о сделанном ходе другому игроку
  socket.on('playMove', (data) => {
    socket.broadcast.to(data.gameId).emit('movePlayed', {
      fields: data.fields,
      gameId: data.gameId,
    });
  });

  // Извещаем игроков о победителе или ничье
  socket.on('gameEnded', (data) => {
    io.sockets.in(data.gameId).emit('gameEnd', data);
  });

  // Отправляем игрокам сообщение чата
  socket.on('sendMessage', (data) => {
    io.sockets.in(data.gameId).emit('receiveMessage', data);
  });
});
