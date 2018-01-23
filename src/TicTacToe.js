import React from 'react';
import io from   'socket.io-client';
import Player from './Player';
import Game from './Game';
import { uniqueId } from 'lodash';
import update from 'immutability-helper';
import checkWinner from './checkWinner';
import beep from './audio/beep.mp3'

export default class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      form: {
        gameId: '',
        firstUsername: '',
        secondUsername: '',
      },
      chatMessage: '',
      displayWelcomeWindow: true,
      welcomeMessage: '',
      // Проверка,что два игрока подключились к игре
      isCompletedGame: false,
      player: '',
      game: '',
      // все возможные выигрышные комбинации
      winOptions: [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ],
      // выиграшная комбинация
      winFields: [],
      chatMessages: [],
      // Игровое поле
      fields: [
        { id: '0', text: '' },
        { id: '1', text: '' },
        { id: '2', text: '' },
        { id: '3', text: '' },
        { id: '4', text: '' },
        { id: '5', text: '' },
        { id: '6', text: '' },
        { id: '7', text: '' },
        { id: '8', text: '' },
      ],
    };

    this.socket = io.connect('http://localhost:5000');

    this.socket.on('newGame', (data) => {
      const welcomeMessage =
        `Привет, ${data.name}. Попроси своего друга ввести номер игры:
        ${data.gameId}. Ждем второго игрока...`;
      // Создаем Game для первого игрока
      const game = new Game(data.gameId);
      // Скрываем стартовое окно, в состояние передаем приветственное сообщение и Game
      this.setState({ displayWelcomeWindow: false, welcomeMessage, game });
    });

    // Приветствуем первого игрока и укомплектованность игры ставим в true.
    // Устанавливаем первый ход за первым игроком
    this.socket.on('player1', (data) => {
      const welcomeMessage = `Привет, ${this.state.player.getPlayerName()}`;
      this.setState({
        welcomeMessage,
        isCompletedGame: true,
        form: { gameId: data.gameId },
      });
      this.state.player.setCurrentMove(true);
    });


    this.socket.on('player2', (data) => {
      const welcomeMessage = `Привет, ${data.name}`;
      // Создаем Game для второго игрока
      const game = new Game(data.gameId);
      this.state.player.setCurrentMove(false);
      this.setState({
        displayWelcomeWindow: false,
        welcomeMessage,
        game,
        isCompletedGame: true,
      });
    });

    // Обработчик, который вызывается после сделанного хода
    this.socket.on('movePlayed', (data) => {
      const { game, player } = this.state;
      // Увеличиваем количество сделаннх ходов текущим игроком
      game.incMoves();
      player.setCurrentMove(true);
      // В состоянии обновляем значения игрового поля
      this.setState({ fields: data.fields });
    });

    // Обработчик, который вызывается после окончания игры
    this.socket.on('gameEnd', (data) => {
      this.setState({ winFields: data.winFields });
      // Выводим сообщение о результатах игры
      setTimeout(() => {
        alert(data.message);
        window.location.reload();
      }, 500);
    });

    // Обработчик. который вызывается после отправки сообщения в чат
    this.socket.on('receiveMessage', (data) => {
      // В состоянии обновляем общий список сообщений чата
      this.setState({ chatMessages: [...this.state.chatMessages, data] });
    });

    // Обработчик ошибок
    this.socket.on('err', (data) => {
      alert(data.message);
    });
  }

  // обработчик на кнопку "отправить"
  onClickSendMessage = (e) => {
    e.preventDefault();
    const { player, game, chatMessage } = this.state;
    // Вызываем обработчик на сервере для трансляции сообщения всем игрокам
    this.socket.emit('sendMessage', {
      user: player.getPlayerName(),
      text: chatMessage,
      gameId: game.getGameId(),
    });
    this.setState({ chatMessage: '' });
  }

  // Обработчик на кнопку "создать"
  onClickCreate = (e) => {
    e.preventDefault();
    const name = this.state.form.firstUsername;
    if (!name) {
      alert('Введите ваше имя');
      return;
    }
    // Создаем Player для первого игрока с атрибутами имя и тип
    this.setState({ player: new Player(name, 'X') });
    // Передаем данные на сервер для трансляции второму игроку
    this.socket.emit('createGame', { name });
  }

  // Обработчик на кнопку "присоединиться"
  onClickJoin = (e) => {
    e.preventDefault();
    const { form: { secondUsername, gameId } } = this.state;
    const name = secondUsername;
    if (!name || !gameId) {
      alert('Введите ваше имя и номер игры');
      return;
    }
    // Создаем Player для второго игрока с атрибутами имя и тип
    this.setState({ player: new Player(name, 'O') });
    // Передаем данные на сервер для трансляции первому игроку
    this.socket.emit('joinGame', { name, gameId });
  }

  // Обработчик на нажатие ячейки игрового поля
  onClickField = (e) => {
    const {
      fields, game, player, winOptions,
    } = this.state;
    // Определяем id ячейки, на которой произошел вызов события
    const fieldId = e.currentTarget.attributes.getNamedItem('id').value;
    // Определяем значение ячейки
    const fieldValue = fields[fieldId].text;
    if (fieldValue) {
      alert('В этой клетке уже был ход!');
      return;
    }
    if (!player.getCurrentMove() || !game) {
      alert('Сейчас не ваш ход!');
      return;
    }

    // Звук при клике на ячейку
    const clickSound = new Audio();
    clickSound.src = beep;
    clickSound.play();

    // Обновление поля после хода
    player.setCurrentMove(false);
    const newFieldValue = { ...fields[fieldId], text: player.getPlayerType() };
    const newfields = update(fields, { [fieldId]: { $set: newFieldValue } });
    this.setState({ fields: newfields });
    game.incMoves();

    // Передаем обновленное поле на сервер для отправки другому игроку
    this.socket.emit('playMove', {
      fields: newfields,
      gameId: game.getGameId(),
    });

    // Добавляем в массив сделанных ходов текущий ход игрока
    player.updatePlayedMoves(Number(fieldId));
    // Проверяем игру на выигрыш
    const isWin = checkWinner(player, game, winOptions);

    // Объявляем победителя, если текущий игрок выиграл или извещаем о ничье, если все ходы были сделаны
    // Передаем эту информацию на сервер для трансляции другому игроку
    if (isWin.result || game.checkTie()) {
      const message = isWin.result ? `${player.getPlayerName()} выиграл` : 'Ничья';
      this.socket.emit('gameEnded', {
        gameId: game.getGameId(),
        message,
        winFields: isWin.winFields,
      });
    }
  }

  // Общий обработчик для полей ввода формы
  handleChangeField = (fieldName, { target: { value } }) => {
    const { form } = this.state;
    this.setState({ form: { ...form, [fieldName]: value } });
  }

  // Обработчики для конкретных полей
  handleChangeFirstUsername = this.handleChangeField.bind(null, 'firstUsername');
  handleChangeSecondUsername = this.handleChangeField.bind(null, 'secondUsername');
  handleChangeGameId = this.handleChangeField.bind(null, 'gameId');
  handleChangeChatMessage = ({ target: { value } }) => {
    this.setState({ chatMessage: value });
  }

  render() {
    const { displayWelcomeWindow, isCompletedGame, welcomeMessage } = this.state;
    return (
      <div>
        <div>{displayWelcomeWindow ? this.renderWelcomeWindow() : ''}</div>
        <div>{this.renderGreeting(welcomeMessage)}</div>
        <div>{isCompletedGame ? this.renderMessageMove() : ''}</div>
        <div>{isCompletedGame ? this.renderBoard() : ''}</div>
        <div>{isCompletedGame ? this.renderChat() : ''}</div>
      </div>
    );
  }

  // Рендер приветсвенного сообщения
  renderGreeting(message) {
    return (
      <h2>{message}</h2>
    );
  }

  // Рендер сообщения о текущем ходе
  renderMessageMove() {
    return (
      <h3>{this.state.player.getCurrentMove() ? 'Ваш ход' : 'Ждем хода противника'}</h3>
    );
  }

  // Рендер игрового поля
  renderBoard() {
    const { fields, winFields } = this.state;
    // Стиль для выигрышной комбинации ячеек
    const divStyle = {
      background: '#00FF7F',
    };

    return (
      <div className="tictactoe clearfix">
        {fields.map((tile) => {
          const winStyle = winFields.length > 0 && winFields.includes(Number(tile.id)) ? divStyle : {};
          return <div key={tile.id} onClick={this.onClickField} style={winStyle} className="tile" id={tile.id}>{tile.text}</div>;
        })}
      </div>
    );
  }

  // Рендер стартового окна
  renderWelcomeWindow() {
    const { form } = this.state;
    return (
      <div className="container">
        <div className="menu">
          <h1>Tic - Tac - Toe</h1>
          <h3>Как играть:</h3>
          <ol>
            <li>Первый игрок вводит свое имя и создает новую игру</li>
            <li>Второй игрок также вводит свое имя, номер игры и присоединяется</li>
          </ol>
          <h4>Создать новую игру</h4>
          <form className="form-inline">
            <div className="form-group">
              <input type="text" value={form.firstUsername} onChange={this.handleChangeFirstUsername} className="form-control mr-2" name="name" id="nameNew" placeholder="Имя" />
            </div>
            <button onClick={this.onClickCreate} className="btn btn-primary" id="new">Создать</button>
          </form>
          <br /><br />
          <h4>Присоединиться к игре</h4>
          <form className="form-inline">
            <div className="form-group">
              <input type="text" value={form.secondUsername} onChange={this.handleChangeSecondUsername} className="form-control mr-2" name="name" id="nameJoin" placeholder="Имя" />
            </div>
            <div className="form-group">
              <input type="text" value={form.gameId} onChange={this.handleChangeGameId} className="form-control mr-2" name="gameId" id="gameId" placeholder="Номер игры" />
            </div>
            <button onClick={this.onClickJoin} className="btn btn-primary" id="join">Присоединиться</button>
          </form>
        </div>
      </div>
    );
  }

  // Рендер чата
  renderChat() {
    const { chatMessage, chatMessages } = this.state;
    return (
      <div className="chat">
        <div className="card-body">
          <div className="card-title">Чат</div>
          <hr/>
          <div className="messages">
            {chatMessages.map(message => <div key={uniqueId()}>{message.user}: {message.text}</div>)}
          </div>
        </div>
        <form className="form-inline">
          <div className="form-group">
            <input type="text" value={chatMessage} onChange={this.handleChangeChatMessage} className="form-control mr-2 ml-4" name="chatMessage" id="chatMessage" placeholder="Сообщение" />
          </div>
          <button onClick={this.onClickSendMessage} className="btn btn-primary" id="send">Отправить</button>
        </form>
      </div>
    );
  }
}
