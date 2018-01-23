export default class Game {
  constructor(gameId) {
    this.gameId = gameId;
    this.moves = 0;
  }

  // Увеличивает количество общих сделанных ходов
  incMoves() {
    this.moves += 1;
  }

  // Проверка на ничью
  checkTie() {
    return this.moves >= 9;
  }

  getGameId() {
    return this.gameId;
  }
}
