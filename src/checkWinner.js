// Проверка на выигрыш
// Берем массив сделанных ходов текущего игрока.
// Проверяем на совпадение со всеми выигрышными комбинациями

export default (player, game, winOptions) => {
  const currentPlayedrMoves = player.getplayedMoves();
  const iter = (options) => {
    if (options.length === 0) {
      return { result: false, winFields: [] };
    }
    const [curWinOption, ...rest] = options;
    if (curWinOption.filter(option => currentPlayedrMoves.includes(option))
      .length === curWinOption.length) {
      return { result: true, winFields: curWinOption };
    }
    return iter(rest);
  };
  return iter(winOptions);
};
