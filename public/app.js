window.addEventListener('load', onLoad);

function roll(min, max) {
    return Math.round(Math.random() * (max - min) - min);
}

var app;

function loadApp() {
    var fileInput = document.getElementById('input-file');
    if (fileInput.files.length == 0) {
        alert('Please choose an image');
        return;
    }
    var reader = new FileReader();

    reader.addEventListener("load", function () {
        if (app) {
            app.terminate();
        }
        var canvas = document.getElementById('board');
        var imgData = reader.result;
        var algorithm = document.getElementById('form-app').algorithm.value;
        var delay = parseInt(document.getElementById('form-app').delay.value);
        app = new SortVisualization(canvas, imgData, algorithm, delay);
    });

    reader.readAsDataURL(fileInput.files[0]);
}

function onLoad() {
    var formApp = document.getElementById('form-app');
    formApp.addEventListener('submit', function (event) {
        event.preventDefault();
        loadApp();
    });
    formApp.addEventListener('reset', function (event) {
        if (!app) {
            return;
        }
        app.reset();
    });
    formApp.delay.addEventListener('change', function (event) {
        if (!app) {
            return;
        }
        app.delay = parseInt(this.value);
    });
    formApp.delay.addEventListener('input', function (event) {
        if (!app) {
            return;
        }
        app.delay = parseInt(this.value);
    });
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

function resizeCanvas() {
    if (!app || !app.img.complete) {
        return;
    }
    var divHeight = window.innerHeight;
    var divWidth = window.innerWidth - document.getElementById('menu').getBoundingClientRect().width;
    var imgHeight = app.img.height;
    var imgWidth = app.img.width;
    var scale = Math.min(divWidth / imgWidth, divHeight / imgHeight);
    app.canvas.style.width = imgWidth * scale + 'px';
    app.canvas.style.height = imgHeight * scale + 'px';
}

function SortVisualization(canvas, imgData, algorithm, delay) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.algorithm = algorithm;
    this.lastPaintTime = 0;
    this.ms = 1000 / 60;
    this.delay = delay;
    this.done = false;
    this.forceClear = false;
    this.setStatus('Loading Image...');
    this.loadImage(imgData);
}

SortVisualization.prototype.setStatus = function (status) {
    document.getElementById('status').innerHTML = 'Status: ' + status;
};

SortVisualization.prototype.reset = function () {
    this.forceClear = true;
    this.terminate();
    this.clearCanvas();
}

SortVisualization.prototype.terminate = function () {
    this.setStatus('Done!');
    this.done = true;
};

SortVisualization.prototype.setTimeout = function (cb, timeout) {
    if (this.done) {
        return;
    }
    setTimeout(cb, timeout);
};

SortVisualization.prototype.loadImage = function (imgData) {
    this.img = new Image();
    this.img.src = imgData;
    this.img.onload = this.prepare.bind(this);
};

SortVisualization.prototype.prepare = function () {
    if (this.img.width > 1000 || this.img.height > 1000) {
        if (!confirm('Warning: Sorting large images will cause significant lag. Recommended image size is around 500x500. Are you sure you want to continue?')) {
            document.getElementById('btn-reset').click();
            return;
        }
    }
    this.canvas.width = this.img.width;
    this.canvas.height = this.img.height;
    resizeCanvas();
    this.ctx.drawImage(this.img, 0, 0);
    this.imgData = this.ctx.getImageData(0, 0, this.img.width, this.img.height);
    this.imgDataArr = this.imgData.data;

    this.done = false;

    this.arr = [];
    for (var i = 0; i < this.img.height; i++) {
        var innerArr = [];
        for (var j = 0; j < this.img.width; j++) {
            innerArr.push(j);
        }
        this.arr.push(innerArr);
    }

    this.setStatus('Shuffling Image...');
    this.shuffle(2 * this.img.width);

    (window.requestAnimationFrame && requestAnimationFrame(this.paintLoop.bind(this))) || setTimeout(this.paintLoop.bind(this), this.ms);
};

SortVisualization.prototype.clearCanvas = function () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
};

SortVisualization.prototype.paintLoop = function (timestamp) {
    this.clearCanvas();
    var delta = (window.requestAnimationFrame ? timestamp - this.lastPaintTime : this.ms) / 1000;
    this.update(delta);
    if (this.done) {
        if (this.forceClear) {
            this.clearCanvas();
        }
        return;
    }
    (window.requestAnimationFrame && requestAnimationFrame(this.paintLoop.bind(this))) || setTimeout(this.paintLoop.bind(this), this.ms);
    this.lastPaintTime = timestamp;
};

SortVisualization.prototype.update = function (delta) {
    this.display();
};

SortVisualization.prototype.insertion_sort = function () {
    var i = 0;
    var self = this;
    function step() {
        if (i >= self.img.width) {
            self.terminate();
            return;
        }
        for (var k = 0; k < self.img.height; k++) {
            for (var j = i - 1; j >= 0 && (self.arr[k][j] > self.arr[k][j + 1]); j--) {
                self.swap(k, j + 1, j);
            }
        }
        i++;
        self.setTimeout(step, self.delay);
    }
    step();
};

SortVisualization.prototype.bubble_sort = function () {
    var i = 0;
    var self = this;
    var swapped = true;
    function step() {
        if (i >= self.img.width) {
            self.terminate();
            return;
        }
        if (!swapped) {
            self.terminate();
            return;
        }
        swapped = false;
        for (var k = 0; k < self.img.height; k++) {
            for (var j = 0; j < self.img.width - 1 - i; j++) {
                if (self.arr[k][j] > self.arr[k][j + 1]) {
                    self.swap(k, j, j + 1);
                    swapped = true;
                }
            }
        }
        i++;
        self.setTimeout(step, self.delay);
    }
    step();
};

SortVisualization.prototype.comb_sort = function () {
    var gap = this.img.width;
    var shrinkFactor = 1.3;
    var self = this;
    var sorted = false;
    function step() {
        if (sorted) {
            self.terminate();
            return;
        }
        gap = Math.floor(gap / shrinkFactor);
        if (gap > 1) {
            sorted = false;
        } else {
            gap = 1;
            sorted = true;
        }
        for (var k = 0; k < self.img.height; k++) {
            for (var j = 0; j + gap < self.img.width; j++) {
                if (self.arr[k][j] > self.arr[k][j + gap]) {
                    self.swap(k, j, j + gap);
                    sorted = false;
                }
            }
        }
        self.setTimeout(step, self.delay);
    }
    step();
};

SortVisualization.prototype.odd_even_sort = function () {
    var i = 0;
    var self = this;
    var swapped = true;
    function step() {
        if (i >= self.img.width) {
            self.terminate();
            return;
        }
        if (!swapped) {
            self.terminate();
            return;
        }
        swapped = false;
        for (var k = 0; k < self.img.height; k++) {
            for (var j = 1; j < self.img.width - 1; j += 2) {
                if (self.arr[k][j] > self.arr[k][j + 1]) {
                    self.swap(k, j, j + 1);
                    swapped = true;
                }
            }
            for (var j = 0; j < self.img.width - 1; j += 2) {
                if (self.arr[k][j] > self.arr[k][j + 1]) {
                    self.swap(k, j, j + 1);
                    swapped = true;
                }
            }
        }
        i++;
        self.setTimeout(step, self.delay);
    }
    step();
};

SortVisualization.prototype.cocktail_sort = function () {
    var i = 0;
    var self = this;
    var direction = true;
    var swapped = true;
    function step() {
        if (i >= self.img.width) {
            self.terminate();
            return;
        }
        if (!swapped) {
            self.terminate();
            return;
        }
        swapped = false;
        for (var k = 0; k < self.img.height; k++) {
            if (direction) {
                for (var j = 0; j < self.img.width - 1; j++) {
                    if (self.arr[k][j] > self.arr[k][j + 1]) {
                        self.swap(k, j, j + 1);
                        swapped = true;
                    }
                }
            } else {
                for (var j = self.img.width - 2; j >= 0; j--) {
                    if (self.arr[k][j] > self.arr[k][j + 1]) {
                        self.swap(k, j, j + 1);
                        swapped = true;
                    }
                }
            }
        }
        direction = !direction;
        i++;
        self.setTimeout(step, self.delay);
    }
    step();
};

SortVisualization.prototype.selection_sort = function () {
    var i = 0;
    var self = this;
    function step() {
        if (i >= self.img.width) {
            self.terminate();
            return;
        }
        for (var k = 0; k < self.img.height; k++) {
            var min = i;
            for (var j = i + 1; j < self.img.width; j++) {
                if (self.arr[k][j] < self.arr[k][min]) {
                    min = j;
                }
            }
            if (min != i) {
                self.swap(k, min, i);
            }
        }
        i++;
        self.setTimeout(step, self.delay);
    }
    step();
};

//Robert Sedgewick's gap sequence
SortVisualization.prototype.shell_sort = function () {
    var h = 1;
    while (h < this.img.width / 3) {
        h = 3 * h + 1;
    }
    var i = h;
    var self = this;
    function step() {
        if (i >= self.img.width) {
            if (h < 1) {
                self.terminate();
                return;
            }
            h = Math.round(h / 3);
            i = h;
        }
        for (var k = 0; k < self.img.height; k++) {
            for (var j = i; j >= h && (self.arr[k][j] < self.arr[k][j - h]); j -= h) {
                self.swap(k, j, j - h);
            }
        }
        i++;
        self.setTimeout(step, self.delay);
    }
    step();
};

SortVisualization.prototype.heap_sort = function () {
    var i = Math.floor(this.img.width / 2);
    var self = this;
    buildHeap();
    function buildHeap() {
        if (i < 0) {
            i = self.img.width - 1;
            sortHeap();
            return;
        }
        for (var k = 0; k < self.img.height; k++) {
            heapify(k, i, self.img.width);
        }
        i--;
        self.setTimeout(buildHeap, self.delay);
    }
    function sortHeap() {
        if (i < 1) {
            self.terminate();
            return;
        }
        for (var k = 0; k < self.img.height; k++) {
            self.swap(k, 0, i);
            heapify(k, 0, i);
        }
        i--;
        self.setTimeout(sortHeap, self.delay);
    }
    function heapify(k, i, size) {
        var left = i * 2 + 1;
        var right = i * 2 + 2;
        var largest = i;
        if (left < size && self.arr[k][left] > self.arr[k][largest]) {
            largest = left;
        }
        if (right < size && self.arr[k][right] > self.arr[k][largest]) {
            largest = right;
        }
        if (largest != i) {
            self.swap(k, i, largest);
            heapify(k, largest, size);
        }
    }
};

SortVisualization.prototype.shuffle = function (amount) {
    var self = this;
    var i = 0;
    function step() {
        if (i >= amount) {
            self.setStatus('Sorting Image...');
            self[self.algorithm]();
            return;
        }
        for (var j = 0; j < self.img.height; j++) {
            self.swap(j, roll(0, self.img.width - 1), roll(0, self.img.width - 1));
        }
        i++;
        self.setTimeout(step, 0);
    }
    step();
};

SortVisualization.prototype.display = function () {
    this.ctx.putImageData(this.imgData, 0, 0);
};

SortVisualization.prototype.swap = function (k, i, j) {
    this.swapImgArr(i + k * this.img.width, j + k * this.img.width);
    var temp = this.arr[k][i];
    this.arr[k][i] = this.arr[k][j];
    this.arr[k][j] = temp;
};

SortVisualization.prototype.swapImgArr = function (i, j) {
    var red = this.imgDataArr[i * 4];
    var green = this.imgDataArr[i * 4 + 1];
    var blue = this.imgDataArr[i * 4 + 2];
    var alpha = this.imgDataArr[i * 4 + 3];
    this.imgDataArr[i * 4] = this.imgDataArr[j * 4];
    this.imgDataArr[i * 4 + 1] = this.imgDataArr[j * 4 + 1];
    this.imgDataArr[i * 4 + 2] = this.imgDataArr[j * 4 + 2];
    this.imgDataArr[i * 4 + 3] = this.imgDataArr[j * 4 + 3];
    this.imgDataArr[j * 4] = red;
    this.imgDataArr[j * 4 + 1] = green;
    this.imgDataArr[j * 4 + 2] = blue;
    this.imgDataArr[j * 4 + 3] = alpha;
}