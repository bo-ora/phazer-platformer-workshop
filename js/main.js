function Hero(game, x, y, imageName) {
  Phaser.Sprite.call(this, game, x, y, imageName);

  // center the coordinates
  this.anchor.set(0.5, 0.5);

  // 2.5 pixels each frame
  this.speed = 2.5;

  this.direction = {
    LEFT: -1,
    RIGHT: 1
  };
}
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;
Hero.prototype = Object.assign(Hero.prototype, {
  move: function(direction) {
    this.x += direction * this.speed;
  }
});

const PlayState = {
  init: function() {
    this.keys = this.game.input.keyboard.addKeys({
      left: Phaser.KeyCode.LEFT,
      right: Phaser.KeyCode.RIGHT,
    });
  },

  preload: function() {
    this.game.load.json('level:1', 'data/level01.json');

    this.game.load.image('background', 'images/background.png');
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');

    this.game.load.image('hero', 'images/hero_stopped.png');
  },

  create: function() {
    this.game.add.image(0, 0, 'background');

    this._loadLevel(this.game.cache.getJSON('level:1'));
  },

  update: function() {
    this._handleInput();
  },

  _loadLevel: function(data) {
    console.log(data);

    data.platforms.forEach(this._spawnPlatform, this);

    // spawn hero and enemies
    this._spawnCharacters({ hero: data.hero });
  },

  _spawnPlatform: function(platform) {
    this.game.add.sprite(platform.x, platform.y, platform.image);
  },

  _spawnCharacters: function(data) {
    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y, 'hero');
    this.game.add.existing(this.hero);
  },

  _handleInput: function () {
    // move hero left
    if (this.keys.left.isDown) {
      this.hero.move(this.hero.direction.LEFT);
    }

    // move hero left
    if (this.keys.right.isDown) {
      this.hero.move(this.hero.direction.RIGHT);
    }
  }
};

window.onload = function() {
  const game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');

  game.state.add('play', PlayState);
  game.state.start('play');
};