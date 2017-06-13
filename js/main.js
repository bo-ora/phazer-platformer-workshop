const GRAVITY = 1200;
const HERO_SPEED = 400;
const JUMP_SPEED = 600;

// ============================= HERO =========================================
function Hero(game, x, y, imageName) {
  Phaser.Sprite.call(this, game, x, y, imageName);

  // center the coordinates
  this.anchor.set(0.5, 0.5);

  // 2.5 pixels each frame
  this.speed = HERO_SPEED;

  this.jumpSpeed = JUMP_SPEED;

  this.canPerformRocketJump = true

  this.direction = {
    LEFT: -1,
    RIGHT: 1,
    STOP: 0,
  };

  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;
}
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;
Hero.prototype = Object.assign(Hero.prototype, {
  move: function(direction) {
    this.body.velocity.x = direction * this.speed;
  },

  jump: function(speed) {
    const canJump = this.body.touching.down;

    if (canJump) {
      this.body.velocity.y = -this.jumpSpeed;
    } else if (this.canPerformRocketJump) {
      this.canPerformRocketJump = false;
      this.body.velocity.y = -this.jumpSpeed / 2;
    }

    return canJump;
  },

  updateJumpedState: function(isOnTheGround) {
    const jumpStateChanged = isOnTheGround !== this.isOnTheGround;

    if (jumpStateChanged) {
      this.isOnTheGround = isOnTheGround;
      this.canPerformRocketJump = true;
    }
  },

  update: function() {
    this.updateJumpedState(this.body.touching.down);
  }
});

// ============================= PLAY STATE ===================================
const PlayState = {
  init: function() {
    this.game.renderer.renderSession.roundPixeles = true;

    this.keys = this.game.input.keyboard.addKeys({
      left: Phaser.KeyCode.LEFT,
      right: Phaser.KeyCode.RIGHT,
      up: Phaser.KeyCode.UP,
    });

    this.keys.up.onDown.add(function() {
      this.hero.jump();
    }, this);
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

    this.game.load.audio('sfx:jump', 'audio/jump.wav');
  },

  create: function() {
    this.game.add.image(0, 0, 'background');

    this._loadLevel(this.game.cache.getJSON('level:1'));
  },

  update: function() {
    this._handleCollisions();
    this._handleInput();
  },

  _loadLevel: function(data) {
    // create all the groups/layers that we need
    this.platforms = this.game.add.group();

    data.platforms.forEach(this._spawnPlatform, this);

    // spawn hero and enemies
    this._spawnCharacters({ hero: data.hero });

    // enable gravity
    this.game.physics.arcade.gravity.y = GRAVITY;
  },

  _spawnPlatform: function(platform) {
    const sprite = this.platforms.create(platform.x, platform.y, platform.image);

    this.game.physics.enable(sprite);

    sprite.body.allowGravity = false;
    sprite.body.immovable = true;
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
    } else
    // move hero left
    if (this.keys.right.isDown) {
      this.hero.move(this.hero.direction.RIGHT);
    } else
    // stop the character
    {
      this.hero.move(this.hero.direction.STOP);
    }
  },

  _handleCollisions: function() {
    this.game.physics.arcade.collide(this.hero, this.platforms);
  }
};

window.onload = function() {
  const game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');

  game.state.add('play', PlayState);
  game.state.start('play');
};
