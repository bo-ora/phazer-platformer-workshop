const GRAVITY = 1200;
const HERO_SPEED = 400;
const SPIDER_SPEED = 100;
const JUMP_SPEED = 600;
const DIRECTION = {
  LEFT: -1,
  RIGHT: 1,
  STOP: 0,
};

// ============================= HERO =========================================
function Hero(game, x, y, imageName) {
  Phaser.Sprite.call(this, game, x, y, imageName);

  // center the coordinates
  this.anchor.set(0.5, 0.5);

  // 2.5 pixels each frame
  this.speed = HERO_SPEED;

  this.jumpSpeed = JUMP_SPEED;

  this.canPerformRocketJump = true

  this.direction = DIRECTION;

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

    return canJump || this.canPerformRocketJump;
  },

  updateJumpedState: function(isOnTheGround) {
    const jumpStateChanged = isOnTheGround !== this.isOnTheGround;

    if (jumpStateChanged) {
      this.isOnTheGround = isOnTheGround;
      this.canPerformRocketJump = true;
    }
  },

  bounce: function () {
    this.body.velocity.y = -this.speed / 2;
  },

  update: function() {
    this.updateJumpedState(this.body.touching.down);
  }
});

// ============================= SPIDER ========================================
function Spider(game, x, y, imageName) {
  Phaser.Sprite.call(this, game, x, y, imageName);

  // 2.5 pixels each frame
  this.speed = SPIDER_SPEED;
  this.direction = DIRECTION;

  // center the coordinates
  // @TODO: check `Y` influence due to gravity
  this.anchor.set(0.5, 0.5);
  // animation
  this.animations.add('crawl', [0, 1, 2, 1], 8, true);
  this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
  this.animations.play('crawl');

  this.game.physics.enable(this);
  this.body.collideWorldBounds = true;
  this.moveTheAss();
}
Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;
Spider.prototype = Object.assign(Spider.prototype, {
  moveTheAss: function(direction) {
    direction = Number.isInteger(direction) ? direction : this.direction.RIGHT;

    this.body.velocity.x = this.speed * direction;
  },

  die: function() {
    this.body.enable = false;

    this.animations.play('die').onComplete.addOnce(function() {
      this.kill();
    }, this);
  },

  update: function() {
    if (this.body.touching.right || this.body.blocked.right) {
      this.moveTheAss(this.direction.LEFT);
    } else if (this.body.touching.left || this.body.blocked.left) {
      this.moveTheAss(this.direction.RIGHT);
    }
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
      const didJump = this.hero.jump();

      if (didJump) {
        this.sfx.jump.play();
      }
    }, this);

    this.coinPickupCount = 0;
  },

  preload: function() {
    // level
    this.game.load.json('level:1', 'data/level01.json');

    // world
    this.game.load.image('background', 'images/background.png');
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');

    // hero
    this.game.load.image('hero', 'images/hero_stopped.png');

    // spiders
    this.game.load.spritesheet('spider', 'images/spider.png', 43, 32);

    // load sounds
    this.game.load.audio('sfx:jump', 'audio/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/coin.wav');
    this.game.load.audio('sfx:stomp', 'audio/stomp.wav');

    // interactive objects
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');
    this.game.load.image('icon:coin', 'images/coin_icon.png');

    // fonts
    this.game.load.image('font:numbers', 'images/numbers.png');
  },

  create: function() {
    this.game.add.image(0, 0, 'background');

    this._loadLevel(this.game.cache.getJSON('level:1'));

    // add some sound to the jumps
    this.sfx = {
      jump: this.game.add.audio('sfx:jump'),
      coin: this.game.add.audio('sfx:coin'),
      stomp: this.game.add.audio('sfx:stomp'),
    };

    this._createHud();
  },

  update: function() {
    this._handleCollisions();
    this._handleInput();
    this.coinFont.text = `x${this.coinPickupCount}`;
  },

  _loadLevel: function(data) {
    // create all the groups/layers that we need
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();

    this.enemyWalls.visible = false;

    data.platforms.forEach(this._spawnPlatform, this);

    // spawn hero and enemies
    this._spawnCharacters({ hero: data.hero, spiders: data.spiders });
    // spawn interactive onjects
    data.coins.forEach(this._spawnCoin, this);

    // enable gravity
    this.game.physics.arcade.gravity.y = GRAVITY;

  },

  _spawnPlatform: function(platform) {
    const sprite = this.platforms.create(platform.x, platform.y, platform.image);

    this.game.physics.enable(sprite);

    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
  },

  _spawnEnemyWall: function(x, y, side) {
    const sprite = this.enemyWalls.create(x, y, 'invisible-wall');

    sprite.tint = rgbToHex(255, 0, 255);
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);

    //physic properties
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
  },

  _spawnCharacters: function(data) {
    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y, 'hero');
    this.game.add.existing(this.hero);

    // spawn spiders
    data.spiders.forEach(function(spider) {
      const sprite = new Spider(this.game, spider.x, spider.y, 'spider');
      this.spiders.add(sprite);

      // double spiderburger please!
      setTimeout(((g,x,y,n)=>{
        return () => {
          const sprite = new Spider(g,x,y,n);
          this.spiders.add(sprite);
        }
      })(this.game, spider.x, spider.y, 'spider'), 1000);
    }, this);
  },

  _spawnCoin: function (coin) {
    const sprite = this.coins.create(coin.x, coin.y, 'coin');

    sprite.anchor.set(0.5, 0.5);

    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true);
    sprite.animations.play('rotate');

    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
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

    this.game.physics.arcade.overlap(this.hero, this.coins,
      this._onHeroVsCoin, null, this);
    this.game.physics.arcade.overlap(this.hero, this.coins,
      this._onHeroVsCoin, null, this);

    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
    this.game.physics.arcade.collide(this.spiders, this.spiders);

    this.game.physics.arcade.overlap(this.hero, this.spiders,
      this._onHeroVsEnemy, null, this);
  },

  _onHeroVsCoin: function(hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    this.coinPickupCount++;
  },

  _onHeroVsEnemy: function(hero, enemy) {
    const heroIsFalling = hero.body.velocity.y > 0;

    // kill enemies if hero is falling
    if (heroIsFalling) {
      hero.bounce();
      enemy.die();
      this.sfx.stomp.play();
    }
    // game over -> restart the game
    else {
      this.sfx.stomp.play();
      this.game.state.restart();
    }
  },

  _createHud: function() {
    const NUMBERS_STR = '0123456789X ';
    this.coinFont = this.game.add.retroFont('font:numbers', 20, 26,
        NUMBERS_STR, 6);

    const coinIcon = this.game.make.image(0, 0, 'icon:coin');
    const coinScoreImg = this.game.make.image(coinIcon.x + coinIcon.width,
        coinIcon.height / 2, this.coinFont);
    coinScoreImg.anchor.set(0, 0.5);

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.position.set(10, 10);
    this.hud.add(coinScoreImg);
  }
};

window.onload = function() {
  const game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');

  game.state.add('play', PlayState);
  game.state.start('play');
};


// ============================= UTILS ========================================
function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
