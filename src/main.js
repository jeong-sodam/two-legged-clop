import { Game } from "./game.js";
import { Input } from "./input.js";

const canvas = document.querySelector("#game");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('게임을 시작할 수 없습니다: "#game" Canvas 요소를 찾을 수 없습니다.');
}

const context = canvas.getContext("2d");
if (!context) {
  throw new Error("게임을 시작할 수 없습니다: 이 브라우저는 Canvas 2D를 지원하지 않습니다.");
}

context.imageSmoothingEnabled = false;
const input = new Input(window);
const game = new Game(canvas, context, input);
game.start();
