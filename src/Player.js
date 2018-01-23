export default class Player {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.currentMove = true;
    this.playedMoves = [];
  }

  // Обновляет массив сделанных ходов
  updatePlayedMoves(fieldId) {
    this.playedMoves = [...this.playedMoves, fieldId];
  }

  getplayedMoves() {
    return this.playedMoves;
  }

  // Устанавливает текущий ход
  setCurrentMove(move) {
    this.currentMove = move;
  }

  getPlayerName() {
    return this.name;
  }

  getPlayerType() {
    return this.type;
  }

  getCurrentMove() {
    return this.currentMove;
  }
}
