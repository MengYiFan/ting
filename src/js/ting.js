function Player(option) {
    // handle options error
    if (!('music' in option && 'title' in option.music && 'author' in option.music && 'url' in option.music && 'pic' in option.music)) {
        throw '初始化信息缺失。';
    }
    if (option.element === null) {
        throw '获取Player元素标签失败。';
    }

    this.isMobile = navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
    if (this.isMobile) {
        option.autoplay = false;
    }


    // 默认配置信息
    var defaultOption = {
        element: document.getElementsByClassName('player')[0],
        narrow: false,
        autoplay: false,
        showlrc: false
    };
    // 添加默认配置信息在OPTION对象上
    for (var defaultKey in defaultOption) {
        if (defaultOption.hasOwnProperty(defaultKey) && !option.hasOwnProperty(defaultKey)) {
            option[defaultKey] = defaultOption[defaultKey];
        }
    }

    if ( !option.autoplay ) {
        // 播放状态
        this.playerStatus = "false";
    } else {
        this.playerStatus = "true";
    }

    this.lrcFontSize = 20;// 歌词字体大小
    this.lrcPositionOffset = 2;// 歌词位置偏移量

    this.option = option;
}

Player.prototype.init = function () {
    this.element = this.option.element;
    this.music = this.option.music;

    // parser lrc
    if (this.option.showlrc) {
        this.lrcTime = [];
        this.lrcLine = [];
        // 获得歌词内容
        var lrcs = this.element.getElementsByClassName('player-lrc-content')[0].innerHTML;// 歌词内容
        var lines = lrcs.split(/\n/);
        var timeExp = /\[(\d{2}):(\d{2})\.(\d{2})]/;// 时间轴数组
        var lrcExp = /](.*)$/;// 获取歌词数组
        var notLrcLineExp = /\[[A-Za-z]+:/;
        for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].replace(/^\s+|\s+$/g, '');// 去除空白符
            var oneTime = timeExp.exec(lines[i]);
            var oneLrc = lrcExp.exec(lines[i]);// "lrcExp.exec("[al:《后会无期》主题歌]")
            if (oneTime && oneLrc && !lrcExp.exec(oneLrc[1])) {
                this.lrcTime.push(parseInt(oneTime[1]) * 60 + parseInt(oneTime[2]) + parseInt(oneTime[3]) / 100);// 转换为秒
                this.lrcLine.push(oneLrc[1]);
            }
            else if (lines[i] && !notLrcLineExp.exec(lines[i])) {
                throw 'Player Error: lrc format error : should be like `[mm:ss.xx]lyric` : ' + lines[i];
            }
        }
    }
    // 设置封面图片
    document.getElementsByClassName("music-cover")[0].setAttribute("src", this.music.pic);

    // 载入歌词
    if (this.option.showlrc) {
        var lrcHTML = '';
        this.lrcContents = this.element.getElementsByClassName('music-lrc-contents')[0];
        //console.log(this.lrcContents);
        for (i = 0; i < this.lrcLine.length; i++) {
            lrcHTML += '<p>' + this.lrcLine[i] + '</p>';
        }
        this.lrcContents.innerHTML = lrcHTML;
        this.lrcIndex = 0;
        this.lrcContents.getElementsByTagName('p')[0].classList.add('player-lrc-current');
    }

    // 缩略模式
    if (this.option.narrow) {
        this.element.classList.add('player-narrow');
    }

    // 创建video播放
    this.audio = document.createElement("audio");
    this.audio.src = this.music.url;
    this.audio.loop = true;
    this.audio.preload = 'auto';// 页面载入后加载

    // 显示音乐时长
    var _self = this;
    this.audio.addEventListener('durationchange', function() {// 时长改变的时候
        if (_self.audio.duration !== 1) {           // compatibility: Android browsers will output 1 at first
            _self.element.getElementsByClassName('duration-time')[0].innerHTML = _self.secondToTime(_self.audio.duration);// 显示音乐长度
        }
    });

    // 加载进度条
    // 不同的设备可能有不同的触发时间，可以用loadedmetadata代替
    this.audio.addEventListener('loadedmetadata', function () {// 音频预加载时
        _self.element.getElementsByClassName('music-info')[0].innerHTML = _self.music.author + " | " + _self.music.title;
        _self.loadedTime = setInterval(function () {
            var percentage = _self.audio.buffered.end(_self.audio.buffered.length - 1) / _self.audio.duration;// 获得加载进度比率
            _self.updateBar.call(_self, 'player-loader', percentage, 'width');
            if (percentage === 1) {
                clearInterval(_self.loadedTime);
            }
        }, 500);
    });

    // 音频加载错误
    this.audio.addEventListener('error', function () {
        _self.element.getElementsByClassName('music-info')[0].innerHTML = '加载失败 ╥﹏╥';
    });

    // 按钮
    this.playButton = this.element.getElementsByClassName('player-button-play')[0];
    this.pauseButton = this.element.getElementsByClassName('player-button-pause')[0];
    this.playButton.addEventListener('click', function () {
        _self.play.call(_self);
    });
    this.pauseButton.addEventListener('click', function () {
        _self.pause.call(_self);
    });

    // 控制条
    this.playedBar = this.element.getElementsByClassName('player-played')[0];// 播放点
    this.loadedBar = this.element.getElementsByClassName('player-loader')[0];// 缓存点
    this.thumb = this.element.getElementsByClassName('player-thumb')[0];// 滑块
    this.bar = this.element.getElementsByClassName('player-bar-wrap')[0];// bar
    //var barWidth;
    // 点击控制条
    this.bar.addEventListener('click', function (event) {
        console.log("123123");
        var e = event || window.event;
        var barWidth = _self.bar.clientWidth;
        var percentage = (e.clientX - getElementViewLeft(_self.bar)) / barWidth;// 计算点击控制条的相对位置
        _self.updateBar.call(_self, 'player-played', percentage, 'width');// 设置已播放条的宽度
        _self.element.getElementsByClassName('current-time')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);// 设置点击的对应播放时间
        _self.audio.currentTime = parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration;
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self, parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration);
        }
        _self.play.call(_self);
    });
    // 当鼠标按下滑块时
    this.thumb.addEventListener('mousedown', function () {
        clearInterval(_self.playedTime);
        _self.pause.call(_self);
        document.addEventListener('mousemove', thumbMove);
        document.addEventListener('mouseup', thumbUp);
    });
    // 鼠标移动
    function thumbMove (event) {
        var e = event || window.event;
        var percentage = (e.clientX - getElementViewLeft(_self.bar)) / _self.bar.clientWidth;
        percentage = percentage > 0 ? percentage : 0;
        percentage = percentage < 1 ? percentage : 1;
        _self.updateBar.call(_self, 'player-played', percentage, 'width');
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self, parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration);
        }
        _self.element.getElementsByClassName('current-time')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);
    }
    // 释放鼠标
    function thumbUp () {
        document.removeEventListener('mouseup', thumbUp);
        document.removeEventListener('mousemove', thumbMove);
        _self.audio.currentTime = parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration;
        _self.play.call(_self);// 播放
    }
    // 触摸事件位置的缓存
    // 用做触摸按下悬停不动时的情况判断
    this.clientXCache = -1;

    // 当触摸按下滑块时
    this.thumb.addEventListener('touchstart', function () {
        clearInterval(_self.playedTime);
        _self.pause.call(_self);
        document.addEventListener('touchmove', touchMove);
        document.addEventListener('touchend', touchUp);
    });

    // 触摸移动
    function touchMove () {
        var e = event || window.event;
        _self.clientXCache = e.touches[0].clientX;
        touchFunc(e);
    }

    // 触摸事件处理函数
    function touchFunc (e) {
        barWidth = _self.bar.clientWidth;
        var percentage = (_self.clientXCache - getElementViewLeft(_self.bar)) / barWidth;
        percentage = percentage > 0 ? percentage : 0;
        percentage = percentage < 1 ? percentage : 1;
        _self.updateBar.call(_self, 'player-played', percentage, 'width');
        if (_self.option.showlrc) {
            _self.updateLrc.call(_self, parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration);
        }
        _self.element.getElementsByClassName('current-time')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);
    }

    // 触摸释放
    function touchUp () {
        var e = event || window.event;
        touchFunc(e);
        document.removeEventListener('touchend', touchUp);
        document.removeEventListener('touchmove', touchMove);
        _self.audio.currentTime = parseFloat(_self.playedBar.style.width) / 100 * _self.audio.duration;
        _self.play.call(_self);// 播放
    }

    // 当歌词触摸按下滑时
    this.lrcContents.addEventListener('touchstart', function () {
        _self.pause.call(_self);
        clearInterval(_self.playedTime);
        var e = event || window.event;
        startY = event.touches[0].clientY;
        _self.lrcOffsetTop = _self.lrcContents.offsetTop;
        if ( -1 * _self.lrcOffsetTop < _self.lrcContents.offsetHeight ) {
            clearInterval(_self.playedTime);
            document.addEventListener('touchmove', touchLrcMove);
            document.addEventListener('touchend', touchLrcUp);
        }
    });
    // 歌词触摸移动
    function touchLrcMove () {
        var e = event || window.event;
        var moveY = -1 * (event.touches[0].clientY - startY + _self.lrcOffsetTop);// 获得移动的Y轴高度
        moveY = moveY > (_self.lrcContents.offsetHeight - _self.lrcFontSize * _self.lrcPositionOffset) ? 0 : moveY;// 判断是否滑出音乐末尾
        //console.log(_self.lrcContents.offsetTop / 20);
        var touchLrcCurrentIndex = -1 * parseInt( _self.lrcContents.offsetTop / _self.lrcFontSize ) + _self.lrcPositionOffset;// -40px
        _self.lrcContents.getElementsByClassName('player-lrc-current')[0].classList.remove('player-lrc-current');
        _self.lrcContents.getElementsByTagName('p')[touchLrcCurrentIndex].classList.add('player-lrc-current');
        _self.lrcContents.style.top = -1 * moveY + "px";
        //console.log(moveY + "@" + _self.lrcContents.offsetHeight);
        // 滑块位置响应
        var percentage = touchLrcCurrentIndex / (_self.lrcContents.offsetHeight / _self.lrcFontSize);
        percentage = percentage > 0 ? percentage : 0;//lrcPositionOffset
        percentage = percentage < 1 ? percentage : 1;
        _self.updateBar.call(_self, 'player-played', percentage, 'width');
        // 播放位置时间响应
        _self.element.getElementsByClassName('current-time')[0].innerHTML = _self.secondToTime(percentage * _self.audio.duration);
    }
    // 歌词触摸释放
    function touchLrcUp () {
        document.removeEventListener('touchend', touchLrcUp);
        document.removeEventListener('touchmove', touchLrcMove);
        _self.audio.currentTime = -1 * parseFloat((_self.lrcContents.offsetTop - _self.lrcFontSize * _self.lrcPositionOffset) / _self.lrcContents.offsetHeight) * _self.audio.duration;
        _self.play.call(_self);// 播放
    }
    /*
    // control volume
    this.audio.volume = 0.8;
    this.volumeBar = this.element.getElementsByClassName('player-volume')[0];
    var volumeBarWrap = this.element.getElementsByClassName('aplayer-volume-bar')[0];
    var volumeicon = _self.element.getElementsByClassName('aplayer-time')[0].getElementsByTagName('i')[0];
    var barHeight = 35;
    this.element.getElementsByClassName('aplayer-volume-bar-wrap')[0].addEventListener('click', function (event) {
        var e = event || window.event;
        var percentage = (barHeight - e.clientY + getElementViewTop(volumeBarWrap)) / barHeight;
        percentage = percentage > 0 ? percentage : 0;
        percentage = percentage < 1 ? percentage : 1;
        _self.updateBar.call(_self, 'volume', percentage, 'height');
        _self.audio.volume = percentage;
        if (_self.audio.muted) {
            _self.audio.muted = false;
        }
        if (percentage === 1) {
            volumeicon.className = 'demo-icon aplayer-icon-volume-up';
        }
        else {
            volumeicon.className = 'demo-icon aplayer-icon-volume-down';
        }
    });
    volumeicon.addEventListener('click', function () {
        if (_self.audio.muted) {
            _self.audio.muted = false;
            volumeicon.className = _self.audio.volume === 1 ? 'demo-icon aplayer-icon-volume-up' : 'demo-icon aplayer-icon-volume-down';
            _self.updateBar.call(_self, 'volume', _self.audio.volume, 'height');
        }
        else {
            _self.audio.muted = true;
            volumeicon.className = 'demo-icon aplayer-icon-volume-off';
            _self.updateBar.call(_self, 'volume', 0, 'height');
        }
    });
*/
    // get element's view position
    function getElementViewLeft (element) {
        var actualLeft = element.offsetLeft;
        var current = element.offsetParent;
        var elementScrollLeft;
        while (current !== null){
            actualLeft += current.offsetLeft;
            current = current.offsetParent;
        }
        elementScrollLeft = document.body.scrollLeft + document.documentElement.scrollLeft;
        return actualLeft - elementScrollLeft;
    }

    function getElementViewTop (element) {
        var actualTop = element.offsetTop;
        var current = element.offsetParent;
        var elementScrollTop;
        while (current !== null){
            actualTop += current. offsetTop;
            current = current.offsetParent;
        }
        elementScrollTop = document.body.scrollTop + document.documentElement.scrollTop;
        return actualTop - elementScrollTop;
    }

    // autoplay
    if (this.option.autoplay) {
        this.play();
    }
};

// play
Player.prototype.play = function () {
    if ( this.playerStatus == "false" ) {
        this.playButton.style.display = "none";
        this.pauseButton.style.display = "block";
        this.audio.play();
        document.getElementsByClassName('music-cover')[0].className = "music-cover music-cover-active";
        var _self = this;
        this.playedTime = setInterval(function () {// 更新目前播放的时间对应的BAR长度以及时间
            _self.updateBar.call(_self, 'player-played', _self.audio.currentTime / _self.audio.duration, 'width');
            if (_self.option.showlrc) {
                _self.updateLrc.call(_self);
            }
            _self.element.getElementsByClassName('current-time')[0].innerHTML = _self.secondToTime(_self.audio.currentTime);
        }, 100);
        this.playerStatus = "true";
    }
};

// pause
Player.prototype.pause = function () {
    if ( this.playerStatus == "true" ) {
        this.playButton.style.display = "block";
        this.pauseButton.style.display = "none";
        this.audio.pause();
        clearInterval(this.playedTime);
        this.playerStatus = "false";
        document.getElementsByClassName('music-cover')[0].className = "music-cover";
    }
};

// update progress bar (loading progress bar, play progress bar)
Player.prototype.updateBar = function (type, percentage, direction) {
    percentage = percentage > 0 ? percentage : 0;
    percentage = percentage < 1 ? percentage : 1;
    document.getElementsByClassName(type)[0].style[direction] = percentage * 100 + '%';
};

// update lrc
Player.prototype.updateLrc = function (currentTime) {
    if (!currentTime) {
        currentTime = this.audio.currentTime;
    }
    if (currentTime < this.lrcTime[this.lrcIndex] || currentTime >= this.lrcTime[this.lrcIndex + 1]) {
        for (var i = 0; i < this.lrcTime.length; i++) {
            if (currentTime >= this.lrcTime[i] && (!this.lrcTime[i + 1] || currentTime < this.lrcTime[i + 1])) {
                this.lrcIndex = i;
                //this.lrcContents.style.transform = 'translateY(' + this.lrcIndex * -19 + 'px)'; // 不兼容微信
                this.lrcContents.style.top = (this.lrcIndex) * -1 * this.lrcFontSize + this.lrcFontSize * this.lrcPositionOffset + 'px'; // 多了40px
                this.lrcContents.getElementsByClassName('player-lrc-current')[0].classList.remove('player-lrc-current');
                this.lrcContents.getElementsByTagName('p')[i].classList.add('player-lrc-current');
            }
        }
    }
};

// format second to 00:00
Player.prototype.secondToTime = function (second) {
    var add0 = function (num) {
        return num < 10 ? '0' + num : '' + num;
    };
    var min = parseInt(second / 60);
    var sec = parseInt(second - min * 60);
    return add0(min) + ':' + add0(sec);
};